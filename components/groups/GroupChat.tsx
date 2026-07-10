import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { MessageSquare, ArrowLeft, Send, Settings, Users, Share2, Paperclip, FileText, CheckCheck, Check, Loader2 } from 'lucide-react';
import { GroupModel, GroupMessageModel } from './types';
import { useNotifications } from '../NotificationContext';

interface GroupChatProps {
  user: User;
  group: GroupModel;
  onBack: () => void;
  onOpenSettings: () => void;
}

export const GroupChat: React.FC<GroupChatProps> = ({ user, group, onBack, onOpenSettings }) => {
  const [messages, setMessages] = useState<GroupMessageModel[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerToast } = useNotifications();

  const handleShareGroup = async () => {
    const shareLink = `${window.location.origin}/?joinGroup=${group.id}`;
    const shareTitle = `Join my Study Group: ${group.name}`;
    const shareText = `Hey! Join our study group "${group.name}" on SJ Tutor AI to study and chat together. 📚✨`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareLink,
        });
        triggerToast("Shared successfully!", `Invited friends to join ${group.name}.`, "Quiz Updates");
      } catch (err) {
        console.warn("Web Share failed or cancelled:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareLink);
        triggerToast("Group link copied!", "Share it with your friends to join.", "Quiz Updates");
      } catch (err) {
        console.error("Clipboard copy failed:", err);
        alert("Failed to copy link. Please manually copy this URL: " + shareLink);
      }
    }
  };

  // Subscribe to real-time messages with client-side deduplication
  useEffect(() => {
    const q = query(
      collection(db, 'groups', group.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as GroupMessageModel[];

        // Client-side deduplication via clientMsgId or Firestore document id
        const uniqueFetched = fetched.reduce((acc: GroupMessageModel[], current) => {
          const isDuplicate = acc.some((item) => {
            if (current.clientMsgId && item.clientMsgId === current.clientMsgId) return true;
            return item.id === current.id;
          });
          if (!isDuplicate) {
            acc.push(current);
          }
          return acc;
        }, []);

        setMessages(uniqueFetched);
        scrollToBottom();
      },
      (error) => {
        console.error('Error fetching group messages:', error);
      }
    );

    return unsubscribe;
  }, [group.id]);

  // Update read receipts in the background when viewing messages
  useEffect(() => {
    if (!user || messages.length === 0) return;

    // Filter messages where we are not in readBy, and are not the sender
    const unreadMessages = messages.filter((msg) => {
      if (msg.senderId === user.uid || msg.senderId === 'system') return false;
      return !msg.readBy || !msg.readBy.includes(user.uid);
    });

    if (unreadMessages.length === 0) return;

    unreadMessages.forEach(async (msg) => {
      try {
        const msgRef = doc(db, 'groups', group.id, 'messages', msg.id);
        await updateDoc(msgRef, {
          readBy: arrayUnion(user.uid),
        });
      } catch (err) {
        console.warn(`Failed to update read receipt for message ${msg.id}:`, err);
      }
    });
  }, [messages, user, group.id]);

  // Handle scrolling to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');

    // Unique client-side ID for deduplication
    const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Optimistic UI updates
    const tempId = `temp-${clientMsgId}`;
    const tempMessage: GroupMessageModel = {
      id: tempId,
      text: messageText,
      senderId: user.uid,
      senderName: user.displayName || 'User',
      createdAt: new Date(),
      clientMsgId,
      readBy: [user.uid]
    };

    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      await addDoc(collection(db, 'groups', group.id, 'messages'), {
        text: messageText,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        createdAt: serverTimestamp(),
        clientMsgId,
        readBy: [user.uid]
      });
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.clientMsgId !== clientMsgId));
      alert('Failed to send message. Please try again.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 4MB for Firestore document payload limitations (Base64 is ~33% larger)
    const MAX_SIZE_MB = 4;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`File size exceeds ${MAX_SIZE_MB}MB. Please select a smaller file for direct sharing.`);
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Url = reader.result as string;
        let mediaType: 'image' | 'video' | 'audio' | 'document' = 'document';
        
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type.startsWith('audio/')) mediaType = 'audio';

        const clientMsgId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Optimistic UI update
        const tempId = `temp-${clientMsgId}`;
        const tempMessage: GroupMessageModel = {
          id: tempId,
          text: `Sent attachment: ${file.name}`,
          senderId: user.uid,
          senderName: user.displayName || 'User',
          createdAt: new Date(),
          mediaUrl: base64Url,
          mediaType: mediaType,
          mediaName: file.name,
          clientMsgId,
          readBy: [user.uid]
        };

        setMessages((prev) => [...prev, tempMessage]);
        scrollToBottom();

        await addDoc(collection(db, 'groups', group.id, 'messages'), {
          text: `Sent attachment: ${file.name}`,
          senderId: user.uid,
          senderName: user.displayName || 'User',
          createdAt: serverTimestamp(),
          mediaUrl: base64Url,
          mediaType: mediaType,
          mediaName: file.name,
          clientMsgId,
          readBy: [user.uid]
        });

      } catch (err) {
        console.error('Failed to upload attachment:', err);
        alert('Could not attach file. Please try again.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert('Error reading attachment file.');
    };
    reader.readAsDataURL(file);
  };

  // Format date helper
  const formatTime = (createdAt: any) => {
    if (!createdAt) return '';
    let date: Date;
    if (createdAt.toDate) {
      date = createdAt.toDate();
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else {
      date = new Date(createdAt);
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by day
  const messageGroups = messages.reduce((groupsArr: { dateStr: string; items: GroupMessageModel[] }[], message) => {
    if (!message.createdAt) return groupsArr;
    
    let date: Date;
    if (message.createdAt.toDate) {
      date = message.createdAt.toDate();
    } else if (message.createdAt instanceof Date) {
      date = message.createdAt;
    } else if (message.createdAt.seconds) {
      date = new Date(message.createdAt.seconds * 1000);
    } else {
      date = new Date(message.createdAt);
    }

    const dateStr = date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    const lastGroup = groupsArr[groupsArr.length - 1];

    if (lastGroup && lastGroup.dateStr === dateStr) {
      lastGroup.items.push(message);
    } else {
      groupsArr.push({ dateStr, items: [message] });
    }
    return groupsArr;
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950/20 rounded-3xl border border-slate-200 dark:border-slate-800/80 overflow-hidden text-left shadow-lg">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-150 dark:border-slate-800/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-all"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight leading-tight">
              {group.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                {group.category || 'Study'}
              </span>
              <div className="flex items-center text-xs font-semibold text-slate-400">
                <Users className="w-3.5 h-3.5 mr-1" />
                {group.memberCount || 1} members
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareGroup}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all border border-slate-200/40 dark:border-slate-700 flex items-center justify-center"
            title="Share Group Link"
          >
            <Share2 className="w-5 h-5 text-primary-500" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all border border-slate-200/40 dark:border-slate-700 flex items-center justify-center"
            title="Group settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {messageGroups.length > 0 ? (
          messageGroups.map((groupObj, groupIdx) => (
            <div key={groupIdx} className="space-y-4 animate-in fade-in duration-200">
              {/* Date Marker */}
              <div className="flex justify-center">
                <span className="text-[10px] font-black tracking-wider uppercase bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full">
                  {groupObj.dateStr}
                </span>
              </div>

              {groupObj.items.map((msg) => {
                const isMe = msg.senderId === user.uid;
                const isSystem = msg.senderId === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2 max-w-lg mx-auto">
                      <div className="bg-primary-50/50 dark:bg-slate-900/50 border border-primary-100/40 dark:border-slate-800/40 rounded-2xl px-5 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed shadow-sm">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                const otherReaders = msg.readBy ? msg.readBy.filter(uid => uid !== user.uid) : [];
                const isReadByOthers = otherReaders.length > 0;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] ${
                      isMe ? 'ml-auto' : 'mr-auto'
                    }`}
                  >
                    {!isMe && (
                      <span className="text-xs font-bold text-slate-400 mb-1 ml-1">
                        {msg.senderName}
                      </span>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${
                        isMe
                          ? 'bg-primary-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-150 dark:border-slate-800/60 rounded-tl-none'
                      }`}
                    >
                      {/* Text text content */}
                      <p>{msg.text}</p>

                      {/* Attachment Rendering */}
                      {msg.mediaUrl && (
                        <div className="mt-3 overflow-hidden rounded-xl bg-slate-100/5 dark:bg-black/20 border border-black/5 dark:border-white/5 p-1 max-w-full">
                          {msg.mediaType === 'image' && (
                            <img
                              src={msg.mediaUrl}
                              alt={msg.mediaName || 'Image attachment'}
                              className="max-h-60 rounded-xl object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.mediaUrl, '_blank')}
                            />
                          )}
                          {msg.mediaType === 'video' && (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="max-h-60 rounded-xl max-w-full bg-black"
                            />
                          )}
                          {msg.mediaType === 'audio' && (
                            <audio
                              src={msg.mediaUrl}
                              controls
                              className="w-full max-w-xs mt-1"
                            />
                          )}
                          {msg.mediaType === 'document' && (
                            <a
                              href={msg.mediaUrl}
                              download={msg.mediaName || 'attachment'}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                isMe 
                                  ? 'bg-white/10 hover:bg-white/15 border-white/10 text-white' 
                                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white'
                              }`}
                            >
                              <div className="p-2 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold truncate max-w-[150px]">{msg.mediaName || 'Document'}</p>
                                <p className={`text-[10px] mt-0.5 ${isMe ? 'text-primary-100' : 'text-slate-400'}`}>Click to download</p>
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isMe && (
                        <span>
                          {isReadByOthers ? (
                            <CheckCheck className="w-3.5 h-3.5 text-primary-500" title="Read by group members" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400" title="Delivered" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center text-primary-500 animate-bounce mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-white">Start the Discussion</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
              Send the first message to coordinate your study schedules and goals!
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800/60 shrink-0 space-y-2"
      >
        <div className="flex items-center gap-2">
          {/* File input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 disabled:opacity-50"
            title="Attach photo, video, document, or audio"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isUploading}
            placeholder={isUploading ? "Uploading file..." : `Message ${group.name}...`}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400 text-sm disabled:opacity-75"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isUploading}
            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-md shadow-primary-600/20 disabled:opacity-50 shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
