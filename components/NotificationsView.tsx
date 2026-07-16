import React, { useState, useEffect } from 'react';
import { 
  Bell, Sparkles, Flame, Brain, Trophy, AlertTriangle, 
  Check, Trash2, Info, Smartphone, SlidersHorizontal,
  ShieldAlert, Send, Calendar, Clock, RotateCcw, AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications, NotificationCategory } from './NotificationContext';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const CATEGORY_STYLES: Record<NotificationCategory, {
  icon: React.ReactNode;
  bg: string;
  border: string;
  text: string;
  iconBg: string;
}> = {
  'New Features': {
    icon: <Sparkles className="w-5 h-5" />,
    bg: 'bg-violet-50/50 dark:bg-violet-950/20',
    border: 'border-violet-100 dark:border-violet-900/50',
    text: 'text-violet-700 dark:text-violet-300',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
  },
  'Daily Streak Reminders': {
    icon: <Flame className="w-5 h-5 text-orange-500" />,
    bg: 'bg-orange-50/50 dark:bg-orange-950/20',
    border: 'border-orange-100 dark:border-orange-900/50',
    text: 'text-orange-700 dark:text-orange-300',
    iconBg: 'bg-orange-100 dark:bg-orange-900/50',
  },
  'Quiz Updates': {
    icon: <Brain className="w-5 h-5 text-blue-500" />,
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    border: 'border-blue-100 dark:border-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
  },
  'Competition Announcements': {
    icon: <Trophy className="w-5 h-5 text-amber-500" />,
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    border: 'border-amber-100 dark:border-amber-800/50',
    text: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
  },
  'Important Alerts': {
    icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
    bg: 'bg-rose-50/50 dark:bg-rose-950/20',
    border: 'border-rose-100 dark:border-rose-900/50',
    text: 'text-rose-700 dark:text-rose-300',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
  },
};

interface LogItem {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  timestamp: number;
  senderId: string;
  targetType: 'all' | 'selected' | 'class';
  targetValue: string[];
  recipientCount: number;
  successCount: number;
  failureCount: number;
  status: 'success' | 'failed' | 'partially_failed' | 'scheduled';
  errors?: string[];
}

interface SchedItem {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  timestamp: number;
  scheduledTime: number;
  status: 'pending' | 'sent';
  targetType: 'all' | 'selected' | 'class';
  targetValue: string[];
}

const NotificationsView: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    permissionStatus, 
    requestPermission, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    deleteNotification,
    sendBulkNotification,
    isAdminUser
  } = useNotifications();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'inbox' | 'admin'>('inbox');

  // Filter Tabs
  const [activeFilter, setActiveFilter] = useState<'All' | NotificationCategory>('All');

  // Admin Broadcast Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<NotificationCategory>('Important Alerts');
  const [targetType, setTargetType] = useState<'all' | 'selected' | 'class'>('all');
  const [targetValueStr, setTargetValueStr] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<boolean | null>(null);
  const [sendErrorMsg, setSendErrorMsg] = useState('');

  // Admin Real-time Databases
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [scheds, setScheds] = useState<SchedItem[]>([]);

  // Fetch admin logs and scheduled lists in real-time
  useEffect(() => {
    if (!isAdminUser) return;

    // Listen to delivery logs
    const logsRef = collection(db, 'notification_logs');
    const logsQuery = query(logsRef, orderBy('timestamp', 'desc'), limit(30));
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      const items: LogItem[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          title: data.title || '',
          body: data.body || '',
          category: data.category || 'Important Alerts',
          timestamp: data.timestamp || Date.now(),
          senderId: data.senderId || '',
          targetType: data.targetType || 'all',
          targetValue: data.targetValue || [],
          recipientCount: data.recipientCount || 0,
          successCount: data.successCount || 0,
          failureCount: data.failureCount || 0,
          status: data.status || 'success',
          errors: data.errors || []
        });
      });
      setLogs(items);
    }, (err) => {
      console.warn('Could not read admin delivery logs:', err);
    });

    // Listen to scheduled broadcasts
    const schedRef = collection(db, 'notifications');
    const schedQuery = query(schedRef, orderBy('scheduledTime', 'asc'), limit(30));
    const unsubSched = onSnapshot(schedQuery, (snap) => {
      const items: SchedItem[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'pending' && data.scheduledTime) {
          items.push({
            id: doc.id,
            title: data.title || '',
            body: data.body || '',
            category: data.category || 'Important Alerts',
            timestamp: data.timestamp || Date.now(),
            scheduledTime: data.scheduledTime,
            status: 'pending',
            targetType: data.targetType || 'all',
            targetValue: data.targetValue || []
          });
        }
      });
      setScheds(items);
    }, (err) => {
      console.warn('Could not read scheduled tasks:', err);
    });

    return () => {
      unsubLogs();
      unsubSched();
    };
  }, [isAdminUser]);

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'All') return true;
    return n.category === activeFilter;
  });

  const categories: ('All' | NotificationCategory)[] = [
    'All',
    'New Features',
    'Daily Streak Reminders',
    'Quiz Updates',
    'Competition Announcements',
    'Important Alerts'
  ];

  // Dispatch scheduled broadcast immediately
  const handleDispatchNow = async (sched: SchedItem) => {
    try {
      const confirmed = window.confirm('Are you sure you want to dispatch this scheduled notification now?');
      if (!confirmed) return;

      setIsSending(true);
      const success = await sendBulkNotification(
        sched.title,
        sched.body,
        sched.category,
        sched.targetType,
        sched.targetValue
      );

      if (success) {
        // Delete pending scheduled document
        await deleteDoc(doc(db, 'notifications', sched.id));
        alert('Notification dispatched successfully!');
      } else {
        alert('Dispatched failed. Please review delivery logs.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Cancel scheduled broadcast
  const handleCancelScheduled = async (id: string) => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete this scheduled notification?');
      if (!confirmed) return;

      await deleteDoc(doc(db, 'notifications', id));
      // Delete corresponding log
      await deleteDoc(doc(db, 'notification_logs', id)).catch(() => {});
      alert('Scheduled notification canceled successfully.');
    } catch (err: any) {
      console.error(err);
      alert('Error canceling: ' + err.message);
    }
  };

  // Retry failed delivery log
  const handleRetryFailed = async (log: LogItem) => {
    try {
      const confirmed = window.confirm('Do you want to retry sending this notification to the registered targets?');
      if (!confirmed) return;

      setIsSending(true);
      const success = await sendBulkNotification(
        log.title,
        log.body,
        log.category,
        log.targetType,
        log.targetValue
      );

      if (success) {
        alert('Retry completed successfully!');
      } else {
        alert('Retry dispatch failed. View new log for details.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error during retry: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Submit Broadcast Form
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setSendErrorMsg('Please fill in both title and body fields.');
      return;
    }

    setSendErrorMsg('');
    setSendSuccess(null);
    setIsSending(true);

    try {
      // Parse targets
      let targetValues: string[] = [];
      if (targetType === 'selected' || targetType === 'class') {
        if (!targetValueStr.trim()) {
          setSendErrorMsg(`Please enter target ${targetType === 'selected' ? 'User IDs' : 'Class names'}.`);
          setIsSending(false);
          return;
        }
        targetValues = targetValueStr.split(',').map(s => s.trim()).filter(Boolean);
      }

      // Parse schedule date/time if provided
      let finalScheduledTime: number | undefined;
      if (scheduledDate && scheduledTime) {
        const schedDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        finalScheduledTime = schedDateTime.getTime();
        if (finalScheduledTime <= Date.now()) {
          setSendErrorMsg('Scheduled time must be in the future.');
          setIsSending(false);
          return;
        }
      }

      const success = await sendBulkNotification(
        title,
        body,
        category,
        targetType,
        targetValues,
        finalScheduledTime
      );

      if (success) {
        setSendSuccess(true);
        setTitle('');
        setBody('');
        setTargetValueStr('');
        setScheduledDate('');
        setScheduledTime('');
        setTimeout(() => setSendSuccess(null), 3000);
      } else {
        setSendSuccess(false);
        setSendErrorMsg('Bulk transmission failed. No recipients found or server error.');
      }
    } catch (err: any) {
      setSendSuccess(false);
      setSendErrorMsg(err.message || 'An error occurred during submission.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-20">
      {/* Header section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary-600 animate-swing animate-infinite" />
            Notification Center
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl">
            Stay updated with your personalized learning goals, quiz updates, study reminders, and school news.
          </p>
        </div>

        {/* Tab Selection */}
        {isAdminUser && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 self-start md:self-center">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'inbox'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              My Alerts Inbox
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Admin Broadcaster
            </button>
          </div>
        )}
      </div>

      {/* Permission alert card */}
      {permissionStatus !== 'granted' && activeTab === 'inbox' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Enable Browser Push Notifications</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
                Work offline! Receive real-time Daily Streak Reminders, live quiz notifications, and alerts even when the SJ Tutor AI app is closed.
              </p>
            </div>
          </div>
          <button 
            onClick={requestPermission}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] whitespace-nowrap"
          >
            Allow Notifications
          </button>
        </motion.div>
      )}

      {/* Render Main Tab Views */}
      <AnimatePresence mode="wait">
        {activeTab === 'inbox' ? (
          <motion.div
            key="inbox"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left/Middle Column (Notifications Feed) */}
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                {/* Filters horizontal scroll */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveFilter(cat)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-semibold transition-all border ${
                        activeFilter === cat 
                          ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-500/15' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {cat === 'All' ? 'All Alerts' : cat}
                    </button>
                  ))}
                </div>

                {/* Quick Inbox Controls */}
                <div className="flex gap-1.5 shrink-0 pl-4">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-200 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                      title="Mark all as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button 
                      onClick={clearNotifications}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:border-rose-200 hover:bg-rose-50/50"
                      title="Clear local notifications history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications feed */}
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-10 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800 text-center py-16 shadow-inner"
                    >
                      <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800 text-slate-400">
                        <Info className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-base">All clear!</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mt-1">
                        No notifications inside the <span className="font-semibold">{activeFilter}</span> filter. You are completely caught up!
                      </p>
                    </motion.div>
                  ) : (
                    filteredNotifications.map((notif) => {
                      const styles = CATEGORY_STYLES[notif.category] || CATEGORY_STYLES['New Features'];
                      return (
                        <motion.div
                          key={notif.id}
                          layoutId={`notif-${notif.id}`}
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.25 }}
                          onClick={() => !notif.read && markAsRead(notif.id)}
                          className={`group relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} p-5 transition-all duration-300 hover:shadow-md cursor-pointer flex gap-4 ${
                            notif.read ? 'opacity-85 filter contrast-90' : 'shadow-sm shadow-primary-500/5'
                          }`}
                        >
                          {/* Left Dot for unread */}
                          {!notif.read && (
                            <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-primary-500 animate-ping" />
                          )}

                          {/* Icon */}
                          <div className={`p-2.5 w-11 h-11 rounded-xl shadow-inner flex items-center justify-center shrink-0 ${styles.iconBg} ${styles.text}`}>
                            {styles.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles.iconBg} ${styles.text} self-start`}>
                                {notif.category}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                                • {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                              </span>
                            </div>

                            <h3 className={`text-base font-bold text-slate-800 dark:text-white mb-1 ${!notif.read ? 'font-black text-slate-900' : 'font-medium'}`}>
                              {notif.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed pr-2">
                              {notif.body}
                            </p>
                          </div>

                          {/* Right actions */}
                          <div className="absolute top-5 right-5 flex gap-1 bg-white/40 dark:bg-slate-800/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-0.5 border border-slate-100 dark:border-slate-700">
                            {!notif.read && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notif.id);
                                }}
                                className="p-1 px-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 rounded-md text-[10px] font-bold transition-all flex items-center gap-0.5 active:scale-95 hover:bg-white dark:hover:bg-slate-700"
                                title="Mark as read"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                Read
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              className="p-1 px-1.5 text-rose-500 hover:text-rose-700 rounded-md text-[10px] font-bold transition-all flex items-center gap-0.5 active:scale-95 hover:bg-white dark:hover:bg-slate-700"
                              title="Delete notification"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              Delete
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Sidebar Column (Summary Panel) */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-extrabold text-slate-950 dark:text-white text-base mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary-500" />
                  Notifications Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Total Registered Alerts:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{notifications.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Unread Alerts Remaining:</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-slate-700 text-primary-700 dark:text-primary-300 font-bold">{unreadCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Notification permission:</span>
                    <span className={`font-bold capitalize ${permissionStatus === 'granted' ? 'text-emerald-500' : 'text-slate-500'}`}>
                      {permissionStatus}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    <Info className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                    <span>We use Firestore & standard Service Worker Push to sync notifications seamlessly. Data is preserved across sessions and is accessible across all your devices.</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ADMIN BROADCASTER VIEW */
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Hand: Broadcast Creator Form */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm self-start">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-5">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Send Broadcast</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Deploy custom real-time alerts & scheduling</p>
                </div>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Alert Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Science Challenge Released! 🧪"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
                    required
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Alert Message Body
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter short details explaining the update..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm resize-none"
                    required
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Notification Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
                  >
                    <option value="Important Alerts">🚨 Important Alerts</option>
                    <option value="New Features">✨ New Features</option>
                    <option value="Daily Streak Reminders">🔥 Daily Streak Reminders</option>
                    <option value="Quiz Updates">🧠 Quiz Updates</option>
                    <option value="Competition Announcements">🏆 Competition Announcements</option>
                  </select>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Target Recipients
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {(['all', 'selected', 'class'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTargetType(t)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border capitalize transition-all ${
                          targetType === t
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {targetType !== 'all' && (
                    <input
                      type="text"
                      value={targetValueStr}
                      onChange={(e) => setTargetValueStr(e.target.value)}
                      placeholder={
                        targetType === 'selected' 
                          ? 'Enter comma-separated user UIDs' 
                          : 'Enter class/grade e.g. Grade 10, Class 8'
                      }
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                  )}
                </div>

                {/* Scheduling Parameters */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Schedule Delivery (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Leave blank for immediate transmission.</p>
                </div>

                {/* Status Banners */}
                {sendSuccess === true && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Broadcast deployed successfully! Logs written to history.</span>
                  </div>
                )}
                {sendErrorMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{sendErrorMsg}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {scheduledDate && scheduledTime ? 'Schedule Broadcast' : 'Send Push Alert'}
                </button>
              </form>
            </div>

            {/* Right Hand: Sched Queue & Logs History */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Scheduled Queue */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-4">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Scheduled Broadcaster Queue</h3>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                    {scheds.length} Pending
                  </span>
                </div>

                {scheds.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800">
                    No future scheduled broadcasts found.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {scheds.map((sched) => (
                      <div key={sched.id} className="p-3.5 border border-slate-200/60 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="font-extrabold text-slate-800 dark:text-white">{sched.title}</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 text-[9px] uppercase font-bold">
                              {sched.category}
                            </span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 truncate mb-1.5">{sched.body}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary-500" />
                              Scheduled: {new Date(sched.scheduledTime).toLocaleString()}
                            </span>
                            <span className="capitalize">Audience: {sched.targetType}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleDispatchNow(sched)}
                            className="p-1 px-2 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900 font-extrabold text-[10px] rounded-lg hover:bg-primary-100/50"
                            title="Send Immediately"
                          >
                            Send Now
                          </button>
                          <button
                            onClick={() => handleCancelScheduled(sched.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 border border-slate-200/50 hover:bg-rose-50/20 rounded-lg"
                            title="Cancel Broadcaster"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery logs */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-4">
                  <RotateCcw className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Delivery Audit Logs & History</h3>
                </div>

                {logs.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800">
                    No past delivery history found.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {logs.map((log) => {
                      let statusBadge = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 text-emerald-700 dark:text-emerald-400";
                      if (log.status === 'failed') {
                        statusBadge = "bg-rose-50 dark:bg-rose-950/30 border-rose-100 text-rose-700 dark:text-rose-400";
                      } else if (log.status === 'partially_failed') {
                        statusBadge = "bg-amber-50 dark:bg-amber-950/30 border-amber-100 text-amber-700 dark:text-amber-400";
                      } else if (log.status === 'scheduled') {
                        statusBadge = "bg-blue-50 dark:bg-blue-950/30 border-blue-100 text-blue-700 dark:text-blue-400";
                      }

                      return (
                        <div key={log.id} className="p-4 border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900/40 rounded-2xl text-xs relative group">
                          {/* Top row */}
                          <div className="flex justify-between items-start gap-4 mb-1.5">
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{log.title}</h4>
                              <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5">
                                Log ID: {log.id} • Sent: {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full capitalize shrink-0 ${statusBadge}`}>
                              {log.status.replace('_', ' ')}
                            </span>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 text-xs mb-3 leading-relaxed">{log.body}</p>

                          {/* Stats section */}
                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div>
                              <p className="text-[9px] text-slate-400 uppercase font-black">Category</p>
                              <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{log.category}</p>
                            </div>
                            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700" />
                            <div>
                              <p className="text-[9px] text-slate-400 uppercase font-black">Audience</p>
                              <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px] capitalize">{log.targetType}</p>
                            </div>
                            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700" />
                            <div>
                              <p className="text-[9px] text-slate-400 uppercase font-black">Success</p>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">{log.successCount} / {log.recipientCount}</p>
                            </div>

                            {/* Retry trigger */}
                            {(log.status === 'failed' || log.status === 'partially_failed') && (
                              <button
                                onClick={() => handleRetryFailed(log)}
                                className="ml-auto px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 text-rose-600 text-[10px] font-black rounded-lg flex items-center gap-1 transition-all active:scale-95"
                                title="Resend to targets"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Retry Send
                              </button>
                            )}
                          </div>

                          {/* Errors details if any */}
                          {log.errors && log.errors.length > 0 && (
                            <div className="mt-2.5 p-2 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/50 rounded-xl text-[10px] text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                              <div className="flex-1 min-w-0 break-words">
                                <span className="font-extrabold uppercase text-[8px] block">Error logs:</span>
                                {log.errors.join(' | ')}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsView;
