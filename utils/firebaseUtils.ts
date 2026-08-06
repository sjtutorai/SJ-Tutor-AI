import { doc, getDoc, setDoc, collection, getDocs, increment, deleteDoc, query, where, serverTimestamp, onSnapshot, orderBy, limit, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { UserProfile, HistoryItem, LeaderboardEntry, StudyGroup, GroupMessage, GroupMember, DirectChat, DirectMessage, DirectChatParticipant, MemberPermissions } from "../types";

export const saveProfileToFirestore = async (uid: string, profile: Partial<UserProfile>) => {
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, profile, { merge: true });
    return true;
  } catch (error: any) {
    const isOffline = !navigator.onLine || (error && error.message && error.message.includes("offline"));
    if (isOffline) {
      console.warn("Saving profile to Firestore skipped or deferred because the client is offline:", error?.message || error);
    } else {
      console.error("Error saving profile to Firestore:", error);
    }
    return false;
  }
};

export const getProfileFromFirestore = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      return {
        ...data,
        isRegisteredInFirestore: true,
        hasCompletedOnboarding: data.hasCompletedOnboarding ?? true,
      };
    }
    return null;
  } catch (error: any) {
    const isOffline = !navigator.onLine || (error && error.message && error.message.includes("offline"));
    if (isOffline) {
      console.warn("Fetching profile from Firestore failed because the client is offline:", error?.message || error);
    } else {
      console.error("Error fetching profile from Firestore:", error);
    }
    return null;
  }
};

export const saveHistoryItemToFirestore = async (uid: string, item: HistoryItem) => {
  if (!uid || uid === "guest") return false;
  try {
    const docRef = doc(db, "users", uid, "history", item.id);
    await setDoc(docRef, item, { merge: true });
    return true;
  } catch (error: any) {
    console.warn("Error saving history item to Firestore:", error);
    return false;
  }
};

export const getHistoryFromFirestore = async (uid: string): Promise<HistoryItem[]> => {
  if (!uid || uid === "guest") return [];
  const colRef = collection(db, "users", uid, "history");
  const snapshot = await getDocs(colRef);
  const historyList: HistoryItem[] = [];
  snapshot.forEach((d) => {
    historyList.push(d.data() as HistoryItem);
  });
  return historyList.sort((a, b) => b.timestamp - a.timestamp);
};

export const syncHistoryWithFirestore = async (uid: string, localItems: HistoryItem[]): Promise<HistoryItem[]> => {
  if (!uid || uid === "guest") return localItems;
  try {
    const firestoreItems = await getHistoryFromFirestore(uid);
    const firestoreIds = new Set(firestoreItems.map((item) => item.id));

    const mergedItems = [...firestoreItems];
    const itemsToSave: Promise<any>[] = [];

    localItems.forEach((localItem) => {
      if (!firestoreIds.has(localItem.id)) {
        mergedItems.push(localItem);
        itemsToSave.push(saveHistoryItemToFirestore(uid, localItem));
      }
    });

    if (itemsToSave.length > 0) {
      await Promise.all(itemsToSave);
    }

    return mergedItems.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.warn("History synchronization failed, falling back to local history:", error);
    return localItems;
  }
};

export const createSharedContent = async (
  type: string,
  title: string,
  content: any,
  ownerUid: string,
  customId?: string
): Promise<string> => {
  try {
    // Generate a unique, user-friendly Share ID or use customId
    const shareId = customId || (Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8));
    const docRef = doc(db, "sharedContent", shareId);
    
    let contentType = type.toLowerCase();
    if (contentType.includes('summary')) contentType = 'summary';
    else if (contentType.includes('homework') || contentType.includes('essay')) contentType = 'homework';
    else if (contentType.includes('quiz')) contentType = 'quiz';
    else if (contentType.includes('tutor') || contentType.includes('chat')) contentType = 'tutor';
    else contentType = 'notes';

    const sharedData = {
      id: shareId,
      shareId,
      type, // keeping for backwards compatibility
      contentType, // new mapped field requested by user
      title,
      content,
      ownerUid, // keeping for backwards compatibility 
      ownerId: ownerUid, // new field requested by user
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
      likes: 0,
      sharesCount: 0,
      lastViewedAt: Date.now(),
      isPublic: true
    };
    
    await setDoc(docRef, sharedData);
    return shareId;
  } catch (error) {
    console.error("Error creating shared content:", error);
    throw error;
  }
};

export const getSharedContent = async (shareId: string): Promise<any | null> => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Auto-migrate in memory for backwards compatibility
      if (data.isPublic === undefined) data.isPublic = true;
      if (!data.id) data.id = shareId;
      if (!data.ownerId && data.ownerUid) data.ownerId = data.ownerUid;
      if (!data.contentType && data.type) {
        const ct = data.type.toLowerCase();
        if (ct.includes('summary')) data.contentType = 'summary';
        else if (ct.includes('homework') || ct.includes('essay')) data.contentType = 'homework';
        else if (ct.includes('quiz')) data.contentType = 'quiz';
        else if (ct.includes('tutor') || ct.includes('chat')) data.contentType = 'tutor';
        else data.contentType = 'notes';
      }

      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching shared content:", error);
    return null;
  }
};

export const incrementViewCount = async (shareId: string) => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await setDoc(docRef, {
      views: increment(1),
      lastViewedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.warn("Failed to increment views:", error);
  }
};

export const incrementLikeCount = async (shareId: string) => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await setDoc(docRef, {
      likes: increment(1)
    }, { merge: true });
  } catch (error) {
    console.warn("Failed to increment likes:", error);
  }
};

export const incrementShareCount = async (shareId: string) => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await setDoc(docRef, {
      sharesCount: increment(1)
    }, { merge: true });
  } catch (error) {
    console.warn("Failed to increment shares count:", error);
  }
};

export const deleteSharedContent = async (shareId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting shared content:", error);
    return false;
  }
};

export const getUserSharedContent = async (uid: string): Promise<any[]> => {
  if (!uid || uid === "guest") return [];
  try {
    const colRef = collection(db, "sharedContent");
    const q = query(colRef, where("ownerUid", "==", uid));
    const snapshot = await getDocs(q);
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching user shared content:", error);
    return [];
  }
};

export const saveQuizScoreToLeaderboard = async (
  uid: string,
  displayName: string,
  photoURL: string | undefined,
  score: number
) => {
  if (!uid || uid === "guest") {
    try {
      const localLeaderboardStr = localStorage.getItem("sjtutor_local_leaderboard") || "[]";
      const localLeaderboard: LeaderboardEntry[] = JSON.parse(localLeaderboardStr);
      let guestEntry = localLeaderboard.find(item => item.uid === "guest");
      if (!guestEntry) {
        guestEntry = {
          uid: "guest",
          displayName: displayName || "Guest Learner",
          photoURL: photoURL || "",
          totalScore: 0,
          quizzesCompleted: 0,
          highestScore: 0,
          lastActive: Date.now()
        };
        localLeaderboard.push(guestEntry);
      }
      guestEntry.totalScore += score;
      guestEntry.quizzesCompleted += 1;
      guestEntry.highestScore = Math.max(guestEntry.highestScore, score);
      guestEntry.lastActive = Date.now();
      localStorage.setItem("sjtutor_local_leaderboard", JSON.stringify(localLeaderboard));
      return true;
    } catch (e) {
      console.warn("Guest leaderboard save failed:", e);
      return false;
    }
  }

  try {
    const docRef = doc(db, "quiz_leaderboard", uid);
    const docSnap = await getDoc(docRef);
    let totalScore = score;
    let quizzesCompleted = 1;
    let highestScore = score;

    if (docSnap.exists()) {
      const current = docSnap.data();
      totalScore = (current.totalScore || 0) + score;
      quizzesCompleted = (current.quizzesCompleted || 0) + 1;
      highestScore = Math.max(current.highestScore || 0, score);
    }

    const leaderboardData: LeaderboardEntry = {
      uid,
      displayName: displayName || "Anonymous Student",
      photoURL: photoURL || "",
      totalScore,
      quizzesCompleted,
      highestScore,
      lastActive: Date.now()
    };

    await setDoc(docRef, leaderboardData, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving leaderboard score:", error);
    return false;
  }
};

export const getQuizLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const colRef = collection(db, "quiz_leaderboard");
    const snapshot = await getDocs(colRef);
    const leaderboard: LeaderboardEntry[] = [];
    snapshot.forEach((d) => {
      leaderboard.push(d.data() as LeaderboardEntry);
    });

    // Also include guest entry from local storage if exists
    const localLeaderboardStr = localStorage.getItem("sjtutor_local_leaderboard") || "[]";
    const localLeaderboard: LeaderboardEntry[] = JSON.parse(localLeaderboardStr);
    const guestEntry = localLeaderboard.find(item => item.uid === "guest");
    if (guestEntry && !leaderboard.some(item => item.uid === "guest")) {
      leaderboard.push(guestEntry);
    }

    return leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  } catch (error) {
    console.error("Error getting quiz leaderboard:", error);
    const localLeaderboardStr = localStorage.getItem("sjtutor_local_leaderboard") || "[]";
    return JSON.parse(localLeaderboardStr);
  }
};

export const deleteHistoryItemFromFirestore = async (uid: string, itemId: string): Promise<boolean> => {
  if (!uid || uid === "guest") return true;
  try {
    const docRef = doc(db, "users", uid, "history", itemId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn("Error deleting history item from Firestore:", error);
    return false;
  }
};

export const saveNotesToFirestore = async (uid: string, notes: any[]) => {
  if (!uid || uid === "guest") return false;
  try {
    const docRef = doc(db, "users", uid, "notes", "all_notes");
    await setDoc(docRef, { notes }, { merge: true });
    return true;
  } catch (error: any) {
    console.error("Error saving notes to Firestore:", error);
    return false;
  }
};

export const getNotesFromFirestore = async (uid: string): Promise<any[]> => {
  if (!uid || uid === "guest") return [];
  try {
    const docRef = doc(db, "users", uid, "notes", "all_notes");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.notes || [];
    }
    return [];
  } catch (error: any) {
    console.error("Error getting notes from Firestore:", error);
    return [];
  }
};

// Helper to clean undefined properties before passing objects to Firestore
export const removeUndefinedFields = <T>(obj: T): T => {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => removeUndefinedFields(item)) as unknown as T;
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    const val = (obj as any)[key];
    if (val !== undefined) {
      clean[key] = removeUndefinedFields(val);
    }
  });
  return clean as T;
};

// =====================================
// GROUPS FIRESTORE UTILITIES
// =====================================

export const createGroupInFirestore = async (group: StudyGroup): Promise<boolean> => {
  try {
    const cleanGroup = removeUndefinedFields(group);
    const docRef = doc(db, "groups", cleanGroup.id);
    await setDoc(docRef, cleanGroup);
    return true;
  } catch (error) {
    console.error("Error creating group in Firestore:", error);
    return false;
  }
};

export const subscribeToAllGroups = (callback: (groups: StudyGroup[]) => void): (() => void) => {
  try {
    const colRef = collection(db, "groups");
    const q = query(colRef, orderBy("updatedAt", "desc"), limit(50));
    return onSnapshot(q, (snapshot) => {
      const groups: StudyGroup[] = [];
      snapshot.forEach((d) => {
        groups.push(d.data() as StudyGroup);
      });
      callback(groups);
    }, (err) => {
      console.warn("Firestore group subscription query error, using fallback:", err);
      // Fallback query without orderBy
      return onSnapshot(colRef, (snap) => {
        const groups: StudyGroup[] = [];
        snap.forEach((d) => groups.push(d.data() as StudyGroup));
        groups.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        callback(groups);
      });
    });
  } catch (err) {
    console.warn("Error setting up group subscription:", err);
    return () => {};
  }
};

export const subscribeToGroupMessages = (groupId: string, callback: (messages: GroupMessage[]) => void): (() => void) => {
  if (!groupId) return () => {};
  try {
    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(200));
    return onSnapshot(q, (snapshot) => {
      const messages: GroupMessage[] = [];
      snapshot.forEach((d) => {
        messages.push(d.data() as GroupMessage);
      });
      callback(messages);
    }, (err) => {
      console.warn("Firestore message subscription query error, using fallback listener:", err);
      return onSnapshot(messagesRef, (snap) => {
        const msgs: GroupMessage[] = [];
        snap.forEach((d) => msgs.push(d.data() as GroupMessage));
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        callback(msgs);
      });
    });
  } catch (err) {
    console.warn("Error subscribing to group messages:", err);
    return () => {};
  }
};

export const sendGroupMessageInFirestore = async (groupId: string, message: GroupMessage): Promise<boolean> => {
  try {
    const cleanMessage = removeUndefinedFields(message);
    const messageDocRef = doc(db, "groups", groupId, "messages", cleanMessage.id);
    await setDoc(messageDocRef, cleanMessage);

    // Update group's lastMessage and updatedAt
    const groupDocRef = doc(db, "groups", groupId);
    await updateDoc(groupDocRef, {
      updatedAt: cleanMessage.timestamp || Date.now(),
      lastMessage: removeUndefinedFields({
        text: cleanMessage.text || '',
        senderName: cleanMessage.senderName || 'Member',
        timestamp: cleanMessage.timestamp || Date.now(),
      }),
    });
    return true;
  } catch (error) {
    console.error("Error sending group message to Firestore:", error);
    return false;
  }
};

export const joinGroupInFirestore = async (groupId: string, member: GroupMember): Promise<boolean> => {
  try {
    const groupDocRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) return false;

    const groupData = groupSnap.data() as StudyGroup;
    const updatedMembers = {
      ...(groupData.members || {}),
      [member.uid]: member,
    };

    await updateDoc(groupDocRef, {
      members: updatedMembers,
      memberCount: Object.keys(updatedMembers).length,
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.error("Error joining group in Firestore:", error);
    return false;
  }
};

export const leaveGroupInFirestore = async (groupId: string, userUid: string): Promise<boolean> => {
  try {
    const groupDocRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) return false;

    const groupData = groupSnap.data() as StudyGroup;
    const members = { ...(groupData.members || {}) };

    // Find and delete all keys matching userUid or member.uid
    Object.keys(members).forEach((key) => {
      if (key === userUid || members[key]?.uid === userUid) {
        delete members[key];
      }
    });

    const newMemberCount = Object.keys(members).length;

    await updateDoc(groupDocRef, {
      members: members,
      memberCount: newMemberCount,
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.error("Error leaving group in Firestore:", error);
    return false;
  }
};

export const toggleGroupMessageReactionInFirestore = async (
  groupId: string,
  messageId: string,
  emoji: string,
  userUid: string
): Promise<boolean> => {
  try {
    const messageRef = doc(db, "groups", groupId, "messages", messageId);
    const msgSnap = await getDoc(messageRef);
    if (!msgSnap.exists()) return false;

    const msgData = msgSnap.data() as GroupMessage;
    const reactions = msgData.reactions || {};
    const currentUsers = reactions[emoji] || [];

    let newUsers: string[];
    if (currentUsers.includes(userUid)) {
      newUsers = currentUsers.filter((u) => u !== userUid);
    } else {
      newUsers = [...currentUsers, userUid];
    }

    const newReactions = { ...reactions };
    if (newUsers.length === 0) {
      delete newReactions[emoji];
    } else {
      newReactions[emoji] = newUsers;
    }

    await updateDoc(messageRef, { reactions: newReactions });
    return true;
  } catch (error) {
    console.error("Error toggling message reaction in Firestore:", error);
    return false;
  }
};

export const voteGroupPollInFirestore = async (
  groupId: string,
  messageId: string,
  optionId: string,
  userUid: string
): Promise<boolean> => {
  try {
    const messageRef = doc(db, "groups", groupId, "messages", messageId);
    const msgSnap = await getDoc(messageRef);
    if (!msgSnap.exists()) return false;

    const msgData = msgSnap.data() as GroupMessage;
    if (!msgData.pollData) return false;

    const poll = { ...msgData.pollData };
    poll.options = poll.options.map((opt) => {
      if (opt.id === optionId) {
        const hasVoted = opt.votes.includes(userUid);
        return {
          ...opt,
          votes: hasVoted ? opt.votes.filter((u) => u !== userUid) : [...opt.votes, userUid],
        };
      } else if (!poll.allowMultiple) {
        // Remove vote from other options if single-choice
        return {
          ...opt,
          votes: opt.votes.filter((u) => u !== userUid),
        };
      }
      return opt;
    });

    await updateDoc(messageRef, { pollData: poll });
    return true;
  } catch (error) {
    console.error("Error voting in group poll:", error);
    return false;
  }
};

export const updateGroupInFirestore = async (groupId: string, updates: Partial<StudyGroup>): Promise<boolean> => {
  try {
    const cleanUpdates = removeUndefinedFields({
      ...updates,
      updatedAt: Date.now()
    });
    const groupDocRef = doc(db, "groups", groupId);
    await updateDoc(groupDocRef, cleanUpdates);
    return true;
  } catch (error) {
    console.error("Error updating group in Firestore:", error);
    return false;
  }
};

export const requestJoinGroupInFirestore = async (
  groupId: string,
  userReq: { uid: string; displayName: string; photoURL?: string }
): Promise<boolean> => {
  try {
    const groupDocRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) return false;

    const groupData = groupSnap.data() as StudyGroup;
    const currentRequests = groupData.joinRequests || {};

    const newRequests = removeUndefinedFields({
      ...currentRequests,
      [userReq.uid]: {
        uid: userReq.uid,
        displayName: userReq.displayName,
        photoURL: userReq.photoURL || '',
        requestedAt: Date.now()
      }
    });

    await updateDoc(groupDocRef, {
      joinRequests: newRequests,
      updatedAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error("Error requesting join group in Firestore:", error);
    return false;
  }
};

export const handleJoinRequestInFirestore = async (
  groupId: string,
  applicantUid: string,
  approve: boolean,
  applicantInfo?: GroupMember
): Promise<boolean> => {
  try {
    const groupDocRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) return false;

    const groupData = groupSnap.data() as StudyGroup;
    const currentRequests = { ...(groupData.joinRequests || {}) };
    delete currentRequests[applicantUid];

    const updates: any = {
      joinRequests: currentRequests,
      updatedAt: Date.now()
    };

    if (approve && applicantInfo) {
      const updatedMembers = {
        ...(groupData.members || {}),
        [applicantInfo.uid]: applicantInfo
      };
      updates.members = updatedMembers;
      updates.memberCount = Object.keys(updatedMembers).length;
    }

    await updateDoc(groupDocRef, updates);
    return true;
  } catch (error) {
    console.error("Error handling join request in Firestore:", error);
    return false;
  }
};

export const deleteGroupInFirestore = async (groupId: string): Promise<boolean> => {
  try {
    const messagesRef = collection(db, "groups", groupId, "messages");
    const msgsSnap = await getDocs(messagesRef);
    const batch = writeBatch(db);
    msgsSnap.forEach((msgDoc) => {
      batch.delete(msgDoc.ref);
    });
    const groupRef = doc(db, "groups", groupId);
    batch.delete(groupRef);
    await batch.commit();
    return true;
  } catch (error) {
    console.warn("Batch group delete failed, trying doc delete fallback:", error);
    try {
      const groupRef = doc(db, "groups", groupId);
      await deleteDoc(groupRef);
      return true;
    } catch (err) {
      console.error("Error deleting group from Firestore:", err);
      return false;
    }
  }
};

// =====================================
// MEMBER PERMISSIONS UTILITIES
// =====================================

export const updateGroupMemberPermissionsInFirestore = async (
  groupId: string,
  memberUid: string,
  permissions: MemberPermissions
): Promise<boolean> => {
  try {
    const groupDocRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) return false;

    const groupData = groupSnap.data() as StudyGroup;
    const members = { ...(groupData.members || {}) };

    if (members[memberUid]) {
      members[memberUid] = {
        ...members[memberUid],
        permissions
      };
      await updateDoc(groupDocRef, {
        members,
        updatedAt: Date.now()
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error updating member permissions:", error);
    return false;
  }
};

export const updateGroupDefaultPermissionsInFirestore = async (
  groupId: string,
  defaultPermissions: MemberPermissions
): Promise<boolean> => {
  try {
    const groupDocRef = doc(db, "groups", groupId);
    await updateDoc(groupDocRef, {
      defaultMemberPermissions: defaultPermissions,
      updatedAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error("Error updating group default permissions:", error);
    return false;
  }
};

// =====================================
// USER SEARCH & DIRECT CHAT UTILITIES
// =====================================

export const searchUsersByEmailOrRegistration = async (
  queryText: string,
  currentUid?: string,
  exactMatchOnly: boolean = true
): Promise<DirectChatParticipant[]> => {
  if (!queryText || queryText.trim().length < 2) return [];
  const cleanQuery = queryText.trim().toLowerCase();

  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const results: DirectChatParticipant[] = [];

    snapshot.forEach((d) => {
      const u = d.data() as UserProfile & { email?: string };
      const uid = d.id;

      if (currentUid && uid === currentUid) return;

      const email = (u.email || '').trim().toLowerCase();
      const regNo = (u.registrationNumber || '').trim().toLowerCase();

      if (exactMatchOnly) {
        // Strict exact match: must match full exact Email ID or full exact Registration ID
        const matchesExactEmail = email !== '' && email === cleanQuery;
        const matchesExactReg = regNo !== '' && regNo === cleanQuery;

        if (matchesExactEmail || matchesExactReg) {
          results.push({
            uid,
            displayName: u.displayName || 'SJ Scholar',
            photoURL: u.photoURL || '',
            email: u.email || email || '',
            registrationNumber: u.registrationNumber || '',
            institution: u.institution || '',
            grade: u.grade || ''
          });
        }
      } else {
        const name = (u.displayName || '').toLowerCase();
        const phone = (u.phoneNumber || '').toLowerCase();

        if (
          email.includes(cleanQuery) ||
          regNo.includes(cleanQuery) ||
          name.includes(cleanQuery) ||
          phone.includes(cleanQuery)
        ) {
          results.push({
            uid,
            displayName: u.displayName || 'SJ Scholar',
            photoURL: u.photoURL || '',
            email: u.email || email || '',
            registrationNumber: u.registrationNumber || '',
            institution: u.institution || '',
            grade: u.grade || ''
          });
        }
      }
    });

    return results;
  } catch (error) {
    console.warn("User search query failed:", error);
    return [];
  }
};

export const getOrCreateDirectChat = async (
  currentUid: string,
  currentUserInfo: { displayName: string; photoURL?: string; email?: string; registrationNumber?: string },
  friendUid: string,
  friendUserInfo: { displayName: string; photoURL?: string; email?: string; registrationNumber?: string }
): Promise<DirectChat> => {
  const participants = [currentUid, friendUid].sort();
  const chatId = `dm_${participants[0]}_${participants[1]}`;
  const chatRef = doc(db, "direct_chats", chatId);

  try {
    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
      const existingData = chatSnap.data() as DirectChat;
      const updatedDetails = {
        ...(existingData.participantDetails || {}),
        [currentUid]: {
          uid: currentUid,
          displayName: currentUserInfo.displayName || 'Student',
          photoURL: currentUserInfo.photoURL || '',
          email: currentUserInfo.email || '',
          registrationNumber: currentUserInfo.registrationNumber || ''
        },
        [friendUid]: {
          uid: friendUid,
          displayName: friendUserInfo.displayName || 'Student',
          photoURL: friendUserInfo.photoURL || '',
          email: friendUserInfo.email || '',
          registrationNumber: friendUserInfo.registrationNumber || ''
        }
      };

      try {
        await updateDoc(chatRef, {
          participantDetails: updatedDetails,
          updatedAt: Date.now()
        });
      } catch (upErr) {
        console.warn("Could not update direct chat participant details:", upErr);
      }

      return {
        ...existingData,
        participantDetails: updatedDetails
      };
    }

    const newChat: DirectChat = {
      id: chatId,
      participants,
      participantDetails: {
        [currentUid]: {
          uid: currentUid,
          displayName: currentUserInfo.displayName || 'Student',
          photoURL: currentUserInfo.photoURL || '',
          email: currentUserInfo.email || '',
          registrationNumber: currentUserInfo.registrationNumber || ''
        },
        [friendUid]: {
          uid: friendUid,
          displayName: friendUserInfo.displayName || 'Student',
          photoURL: friendUserInfo.photoURL || '',
          email: friendUserInfo.email || '',
          registrationNumber: friendUserInfo.registrationNumber || ''
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(chatRef, newChat);
    return newChat;
  } catch (error) {
    console.error("Error creating direct chat:", error);
    // Return local fallback object
    return {
      id: chatId,
      participants,
      participantDetails: {
        [currentUid]: { uid: currentUid, displayName: currentUserInfo.displayName },
        [friendUid]: { uid: friendUid, displayName: friendUserInfo.displayName }
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
};

export const subscribeToUserDirectChats = (
  uid: string,
  callback: (chats: DirectChat[]) => void
): (() => void) => {
  if (!uid) return () => {};
  try {
    const colRef = collection(db, "direct_chats");
    const q = query(colRef, where("participants", "array-contains", uid));
    return onSnapshot(q, (snapshot) => {
      const chats: DirectChat[] = [];
      snapshot.forEach((d) => {
        chats.push(d.data() as DirectChat);
      });
      chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      callback(chats);
    }, (err) => {
      console.warn("Direct chat subscription fallback:", err);
    });
  } catch (err) {
    console.warn("Error subscribing to direct chats:", err);
    return () => {};
  }
};

export const subscribeToDirectMessages = (
  chatId: string,
  callback: (messages: DirectMessage[]) => void
): (() => void) => {
  if (!chatId) return () => {};
  try {
    const msgsRef = collection(db, "direct_chats", chatId, "messages");
    const q = query(msgsRef, orderBy("timestamp", "asc"), limit(200));
    return onSnapshot(q, (snapshot) => {
      const messages: DirectMessage[] = [];
      snapshot.forEach((d) => {
        messages.push(d.data() as DirectMessage);
      });
      callback(messages);
    }, (err) => {
      console.warn("Direct messages query error, fallback to basic snapshot:", err);
      return onSnapshot(msgsRef, (snap) => {
        const msgs: DirectMessage[] = [];
        snap.forEach((d) => msgs.push(d.data() as DirectMessage));
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        callback(msgs);
      });
    });
  } catch (err) {
    console.warn("Error subscribing to direct messages:", err);
    return () => {};
  }
};

export const sendDirectMessageInFirestore = async (
  chatId: string,
  message: DirectMessage
): Promise<boolean> => {
  try {
    const cleanMessage = removeUndefinedFields(message);
    const messageDocRef = doc(db, "direct_chats", chatId, "messages", cleanMessage.id);
    await setDoc(messageDocRef, cleanMessage);

    const chatDocRef = doc(db, "direct_chats", chatId);
    await updateDoc(chatDocRef, {
      updatedAt: cleanMessage.timestamp || Date.now(),
      lastMessage: {
        text: cleanMessage.text || '',
        senderId: cleanMessage.senderId,
        timestamp: cleanMessage.timestamp || Date.now()
      }
    });
    return true;
  } catch (error) {
    console.error("Error sending direct message:", error);
    return false;
  }
};


