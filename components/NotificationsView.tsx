import React, { useState } from 'react';
import { 
  Bell, Sparkles, Flame, Brain, Trophy, AlertTriangle, 
  Check, Trash2, Info, Smartphone, SlidersHorizontal, Send, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications, NotificationCategory } from './NotificationContext';

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

const TEST_NOTIFICATION_ITEMS = [
  { category: "Daily Study", title: "📚 Daily Study", body: "Ready for today's learning session?" },
  { category: "Daily Study", title: "📚 Daily Study", body: "Study for 10 minutes and boost your knowledge!" },
  { category: "Daily Study", title: "📚 Daily Study", body: "A little learning every day makes a big difference." },
  { category: "Daily Study", title: "📚 Daily Study", body: "Your books are waiting for you." },
  { category: "Daily Study", title: "📚 Daily Study", body: "Today's study goal is ready." },

  { category: "Streak", title: "🔥 Streak", body: "Keep your streak alive today!" },
  { category: "Streak", title: "🔥 Streak", body: "You're doing great—don't break your streak." },
  { category: "Streak", title: "🔥 Streak", body: "Another day, another achievement." },
  { category: "Streak", title: "🔥 Streak", body: "Your learning streak needs one more study session." },
  { category: "Streak", title: "🔥 Streak", body: "Maintain your consistency and grow." },

  { category: "Homework", title: "📝 Homework", body: "Have you completed today's homework?" },
  { category: "Homework", title: "📝 Homework", body: "Need help with assignments? Ask SJ Tutor AI." },
  { category: "Homework", title: "📝 Homework", body: "Homework becomes easier with AI assistance." },
  { category: "Homework", title: "📝 Homework", body: "Finish your tasks before the deadline." },
  { category: "Homework", title: "📝 Homework", body: "Let's solve today's doubts together." },

  { category: "Exams", title: "🎯 Exams", body: "Exam coming soon? Start revising now." },
  { category: "Exams", title: "🎯 Exams", body: "Revision time! Your exam is approaching." },
  { category: "Exams", title: "🎯 Exams", body: "Practice today, score better tomorrow." },
  { category: "Exams", title: "🎯 Exams", body: "One chapter revised is one step closer to success." },
  { category: "Exams", title: "🎯 Exams", body: "Smart preparation starts now." },

  { category: "AI features", title: "🤖 AI Features", body: "Ask any question and get an instant answer." },
  { category: "AI features", title: "🤖 AI Features", body: "Stuck on a problem? SJ Tutor AI can help." },
  { category: "AI features", title: "🤖 AI Features", body: "Generate study notes in seconds." },
  { category: "AI features", title: "🤖 AI Features", body: "Explore AI-powered learning tools." },
  { category: "AI features", title: "🤖 AI Features", body: "Learn smarter with personalized guidance." },

  { category: "Quizzes", title: "🧠 Quizzes", body: "Take a quick quiz and test yourself." },
  { category: "Quizzes", title: "🧠 Quizzes", body: "Challenge yourself with today's quiz." },
  { category: "Quizzes", title: "🧠 Quizzes", body: "Ready to score 100%?" },
  { category: "Quizzes", title: "🧠 Quizzes", body: "Practice makes perfect—start a quiz now." },
  { category: "Quizzes", title: "🧠 Quizzes", body: "Strengthen your concepts with a quiz." },

  { category: "Motivation", title: "🌟 Motivation", body: "Success starts with a single study session." },
  { category: "Motivation", title: "🌟 Motivation", body: "Every expert was once a beginner." },
  { category: "Motivation", title: "🌟 Motivation", body: "Small efforts create big achievements." },
  { category: "Motivation", title: "🌟 Motivation", body: "Believe in yourself and keep learning." },
  { category: "Motivation", title: "🌟 Motivation", body: "Your future self will thank you." },

  { category: "Updates", title: "📢 Updates", body: "New features have arrived in SJ Tutor AI." },
  { category: "Updates", title: "📢 Updates", body: "Check out the latest improvements." },
  { category: "Updates", title: "📢 Updates", body: "Exciting updates are waiting for you." },
  { category: "Updates", title: "📢 Updates", body: "Discover what's new today." },
  { category: "Updates", title: "📢 Updates", body: "Your learning experience just got better." },

  { category: "Re-engagement", title: "👋 Re-engagement", body: "It's been a while. Ready to learn again?" },
  { category: "Re-engagement", title: "👋 Re-engagement", body: "We miss seeing you in SJ Tutor AI." },
  { category: "Re-engagement", title: "👋 Re-engagement", body: "Come back and continue your progress." },
  { category: "Re-engagement", title: "👋 Re-engagement", body: "Your study journey is waiting." },
  { category: "Re-engagement", title: "👋 Re-engagement", body: "Pick up where you left off." },

  { category: "Achievements", title: "🏆 Achievements", body: "Congratulations on reaching a new milestone!" },
  { category: "Achievements", title: "🏆 Achievements", body: "You're making excellent progress." },
  { category: "Achievements", title: "🏆 Achievements", body: "Another achievement unlocked!" },
  { category: "Achievements", title: "🏆 Achievements", body: "Keep up the amazing work." },
  { category: "Achievements", title: "🏆 Achievements", body: "You're becoming a smarter learner every day." },

  { category: "Special Notification", title: "🚀 Special Notification", body: "Good Morning! ☀️ What would you like to learn today with SJ Tutor AI?" }
];

const NotificationsView: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    permissionStatus, 
    requestPermission, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    isSubscribedToBackground,
    registerPushNotifications,
    unregisterPushNotifications,
    triggerDeviceTestNotification
  } = useNotifications();

  // Filter Tabs
  const [activeFilter, setActiveFilter] = useState<'All' | NotificationCategory>('All');
  
  // Test Widget states
  const [selectedTestIndex, setSelectedTestIndex] = useState<number>(0);
  const [delayVal, setDelayVal] = useState<number>(5);
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [subscribing, setSubscribing] = useState<boolean>(false);

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

  const handleRegisterBackground = async () => {
    setSubscribing(true);
    try {
      if (isSubscribedToBackground) {
        await unregisterPushNotifications();
      } else {
        await registerPushNotifications();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubscribing(false);
    }
  };

  const handleSendTestPush = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const selectedItem = TEST_NOTIFICATION_ITEMS[selectedTestIndex];
      const success = await triggerDeviceTestNotification(
        selectedItem.title,
        selectedItem.body,
        selectedItem.category,
        delayVal
      );
      if (success) {
        setTestResult({
          success: true,
          message: delayVal > 0 
            ? `Successfully scheduled! You can close your browser tab or app now. It will deliver in ${delayVal} seconds.`
            : 'Push notification triggered instantly!'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Failed to trigger. Make sure you set background notifications to Active.'
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Network error or connection lost.'
      });
    } finally {
      setSendingTest(false);
    }
  };

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

      {/* Connection Mode Alert */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
          isSubscribedToBackground
            ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
            isSubscribedToBackground ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
          }`}>
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Device Background Notifications</h4>
              <span className={`text-[10px] uppercase font-bold py-0.5 px-2 rounded-full ${
                isSubscribedToBackground 
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' 
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 animate-pulse'
              }`}>
                {isSubscribedToBackground ? 'Active' : 'Standby'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isSubscribedToBackground 
                ? 'Device registered successfully. You will receive study reminders even when you are not visiting.' 
                : 'Subscribe to receive native push notifications on your phone or desktop even when the tab is closed.'
              }
            </p>
          </div>
        </div>
        <button
          onClick={handleRegisterBackground}
          disabled={subscribing}
          className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
            isSubscribedToBackground
              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {subscribing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isSubscribedToBackground ? (
            <>Unsubscribe</>
          ) : (
            <>Subscribe Background</>
          )}
        </button>
      </motion.div>

      {/* Permission alert card */}
      {permissionStatus !== 'granted' && !isSubscribedToBackground && (
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
                        <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-primary-500" />
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

        {/* Right Sidebar Column (Device Push Testing + Summary) */}
        <div className="space-y-6">
          
          {/* Live Device Notification Playground */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-xl pointer-events-none" />
            
            <h3 className="font-extrabold text-slate-950 dark:text-white text-base mb-2 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary-500" />
              Device Push Playground
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Force trigger any of the official client notifications dynamically to your current operating system system tray.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Notification Template
                </label>
                <select
                  value={selectedTestIndex}
                  onChange={(e) => setSelectedTestIndex(parseInt(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                >
                  {TEST_NOTIFICATION_ITEMS.map((item, id) => (
                    <option key={id} value={id}>
                      [{item.category}] {item.title.substring(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase mb-1">Live Preview</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white block">
                  {TEST_NOTIFICATION_ITEMS[selectedTestIndex]?.title}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 leading-normal">
                  {TEST_NOTIFICATION_ITEMS[selectedTestIndex]?.body}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>Deliver Delay Timer</span>
                  <span className="font-mono text-primary-600 dark:text-primary-400">{delayVal}s</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 5, 10, 30].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDelayVal(val)}
                      className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                        delayVal === val
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {val === 0 ? 'Instant' : `${val}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action trigger button */}
              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={sendingTest || !isSubscribedToBackground}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Alert...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Trigger via Web-Push
                  </>
                )}
              </button>

              {!isSubscribedToBackground && (
                <p className="text-[10px] text-center text-amber-500 font-bold block mt-1">
                  * Enable &quot;Device Background Notifications&quot; (active status) first.
                </p>
              )}

              {testResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-3 rounded-xl border text-[11px] font-medium leading-normal ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {testResult.message}
                </motion.div>
              )}
            </div>
          </div>

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
                <span>We use Firestore & standard Web Push service workers to provide premium device scheduling. Real updates trigger automatically when the server wakes up.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
