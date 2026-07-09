import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { MessageSquare, ArrowLeft, Send, Settings, Users, Share2 } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Subscribe to real-time messages
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

        setMessages(fetched);
        scrollToBottom();
      },
      (error) => {
        console.error('Error fetching group messages:', error);
      }
    );

    return unsubscribe;
  }, [group.id]);

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

    // Optimistic UI updates
    const tempId = `temp-${Date.now()}`;
    const tempMessage: GroupMessageModel = {
      id: tempId,
      text: messageText,
      senderId: user.uid,
      senderName: user.displayName || 'User',
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      await addDoc(collection(db, 'groups', group.id, 'messages'), {
        text: messageText,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert('Failed to send message. Please try again.');
    }
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
            <div key={groupIdx} className="space-y-4">
              {/* Date Marker */}
              <div className="flex justify-center">
                <span className="text-[10px] font-black tracking-wider uppercase bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full">
                  {groupObj.dateStr}
                </span>
              </div>

              {groupObj.items.map((msg) => {
                const isMe = msg.senderId === user.uid;

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
                      {msg.text}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 px-1">
                      {formatTime(msg.createdAt)}
                    </span>
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
        className="p-4 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800/60 shrink-0"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${group.name}...`}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-slate-400 text-sm"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-md shadow-primary-600/20 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
