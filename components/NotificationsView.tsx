import React, { useState } from 'react';
import { 
  Bell, Sparkles, Flame, Brain, Trophy, AlertTriangle, 
  Check, Trash2, Send, ShieldAlert, CheckCircle2, Info, 
  Smartphone, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications, NotificationCategory } from './NotificationContext';
import { UserProfile } from '../types';

interface NotificationsViewProps {
  userProfile: UserProfile;
}

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

const NotificationsView: React.FC<NotificationsViewProps> = ({ userProfile }) => {
  const { 
    notifications, 
    unreadCount, 
    permissionStatus, 
    requestPermission, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    sendNotification,
    isAdminUser
  } = useNotifications();

  // Filter Tabs
  const [activeFilter, setActiveFilter] = useState<'All' | NotificationCategory>('All');
  
  // Admin form state
  const [adminTitle, setAdminTitle] = useState('');
  const [adminBody, setAdminBody] = useState('');
  const [adminCategory, setAdminCategory] = useState<NotificationCategory>('New Features');
  const [adminTarget, setAdminTarget] = useState<'all' | 'self'>('all');
  const [adminStatus, setAdminStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'All') return true;
    return n.category === activeFilter;
  });

  const handleAdminSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle || !adminBody) return;

    try {
      const targetId = adminTarget === 'self' && userProfile ? 'self_test' : 'all'; 
      const success = await sendNotification(adminTitle, adminBody, adminCategory, targetId);
      
      if (success) {
        setAdminStatus('success');
        setAdminTitle('');
        setAdminBody('');
        setTimeout(() => setAdminStatus('idle'), 4000);
      } else {
        setAdminStatus('error');
        setTimeout(() => setAdminStatus('idle'), 4000);
      }
    } catch (error) {
      console.error("Failed to dispatcher announcement", error);
      setAdminStatus('error');
      setTimeout(() => setAdminStatus('idle'), 4000);
    }
  };

  const categories: ('All' | NotificationCategory)[] = [
    'All',
    'New Features',
    'Daily Streak Reminders',
    'Quiz Updates',
    'Competition Announcements',
    'Important Alerts'
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-20">
      {/* Header section */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary-600 animate-swing" />
            Notification Center
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl">
            Stay updated with your personalized learning goals, quiz updates, study reminders, and school news.
          </p>
        </div>

        {/* Quick controls */}
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:border-primary-200 hover:text-primary-600 dark:hover:text-primary-400 transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={clearNotifications}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:border-rose-200 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Permission alert card */}
      {permissionStatus !== 'granted' && (
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

      {/* Responsive layout - Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Column (Notifications Feed) */}
        <div className="lg:col-span-2">
          
          {/* Filters horizontal scroll */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
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
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar Column (Admin Broadcaster + Stats) */}
        <div className="space-y-6">
          
          {/* Info Card / Stats */}
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

          {/* Admin panel (ONLY shown to sjtutorai@gmail.com) */}
          {isAdminUser && (
            <div className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-900/60 dark:to-slate-800 border-2 border-indigo-200 dark:border-indigo-900/50 p-6 rounded-2xl shadow-md">
              <div className="flex items-center gap-2.5 mb-4 border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
                <ShieldAlert className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-black text-indigo-950 dark:text-white text-base">Admin Dispatch Studio</h3>
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold tracking-wider uppercase">System Broadcast Authority</p>
                </div>
              </div>

              <form onSubmit={handleAdminSend} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notification Title
                  </label>
                  <input
                    type="text"
                    required
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="e.g., Surprise 100 Credit Drop! 🎁"
                    className="w-full text-sm px-3 py-2 border rounded-xl bg-white dark:bg-slate-800 dark:border-slate-700 border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notification Description
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adminBody}
                    onChange={(e) => setAdminBody(e.target.value)}
                    placeholder="Provide description which pops up as a push notification..."
                    className="w-full text-sm px-3 py-2 border rounded-xl bg-white dark:bg-slate-800 dark:border-slate-700 border-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={adminCategory}
                      onChange={(e) => setAdminCategory(e.target.value as NotificationCategory)}
                      className="w-full text-xs p-2 border rounded-xl bg-white dark:bg-slate-800 dark:border-slate-700 border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="New Features">New Features</option>
                      <option value="Daily Streak Reminders">Daily Streak</option>
                      <option value="Quiz Updates">Quiz Updates</option>
                      <option value="Competition Announcements">Competitions</option>
                      <option value="Important Alerts">Alerts</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Audience
                    </label>
                    <select
                      value={adminTarget}
                      onChange={(e) => setAdminTarget(e.target.value as 'all' | 'self')}
                      className="w-full text-xs p-2 border rounded-xl bg-white dark:bg-slate-800 dark:border-slate-700 border-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="all">Broadcast (All Users)</option>
                      <option value="self">Test Push (Self Only)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Push Alert
                </button>
              </form>

              {/* Status messages */}
              <AnimatePresence>
                {adminStatus === 'success' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-bold"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Notification broadcasted & dispatched successfully!</span>
                  </motion.div>
                )}
                {adminStatus === 'error' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300 font-bold"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Broadcast error, failed to post to Cloud database.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
