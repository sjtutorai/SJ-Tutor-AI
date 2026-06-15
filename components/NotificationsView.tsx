import React, { useState } from 'react';
import { 
  Bell, Sparkles, Flame, Brain, Trophy, AlertTriangle, 
  Check, Trash2, Info, Smartphone, SlidersHorizontal,
  Send, Search, BookOpen, Gift, Users, Eye
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

interface NotificationPreset {
  title: string;
  body: string;
  category: NotificationCategory;
  group: 'Learning' | 'AI Assistant' | 'Rewards' | 'Groups' | 'Engagement';
  icon: string;
}

const NOTIFICATION_IDEAS: NotificationPreset[] = [
  // Learning Notifications
  { title: "Time for today's lesson! 📖", body: "Unlock your full potential today. Take just 5 minutes to learn something new with SJ Tutor AI.", category: 'Daily Streak Reminders', group: 'Learning', icon: '📖' },
  { title: "Complete your daily learning goal. 🎯", body: "You are so close to finishing your goal for today! Keep the momentum going.", category: 'Daily Streak Reminders', group: 'Learning', icon: '🎯' },
  { title: "Keep your learning streak alive! 🔥", body: "Don't break your streak now! Continue your consistent progress today.", category: 'Daily Streak Reminders', group: 'Learning', icon: '🔥' },
  { title: "Try today's practice quiz. ✍️", body: "Enhance your brainpower and assess your retaining speed with our daily quiz challenges.", category: 'Quiz Updates', group: 'Learning', icon: '✍️' },
  { title: "Learn something new in 5 minutes. 🧠", body: "Quick lessons are waiting. Perfect for a short break or transit study.", category: 'Daily Streak Reminders', group: 'Learning', icon: '🧠' },
  { title: "New study material is available. 📚", body: "Your SJ Tutor AI has compiled custom revision sheets for your weakest subjects.", category: 'Quiz Updates', group: 'Learning', icon: '📚' },
  { title: "Ready for a quick revision? 🎓", body: "Go over highly tested board question papers in brief summary flashcards.", category: 'Quiz Updates', group: 'Learning', icon: '🎓' },
  { title: "Complete a chapter and earn rewards. ⭐", body: "Study efficiently, pass chapters and accumulate learning credits with us.", category: 'Important Alerts', group: 'Learning', icon: '⭐' },
  { title: "Your homework is waiting. 📝", body: "Get answers with details instantly by copying your prompt or scanning documents.", category: 'Important Alerts', group: 'Learning', icon: '📝' },
  { title: "Start learning now. 🚀", body: "Your customized path is loaded and optimized for maximum revision score.", category: 'Daily Streak Reminders', group: 'Learning', icon: '🚀' },

  // AI Assistant Notifications
  { title: "Ask SJ Tutor AI anything. 🤖", body: "Got a tough problem or a tricky grammar question? Ask us anything, we are ready!", category: 'New Features', group: 'AI Assistant', icon: '🤖' },
  { title: "Need help with a difficult question? 💡", body: "Your tutor is available 24/7 to breakdown complex Math and Science homework.", category: 'New Features', group: 'AI Assistant', icon: '💡' },
  { title: "Scan your textbook and get answers. 📸", body: "Take a picture of any printed formula or diagram to see explainers in seconds.", category: 'New Features', group: 'AI Assistant', icon: '📸' },
  { title: "Solve math problems instantly. 🧮", body: "Step-by-step calculus, equations and algebra solvers are live on your dashboard.", category: 'New Features', group: 'AI Assistant', icon: '🧮' },
  { title: "Translate text with AI. 🌍", body: "Translate assignments or paragraphs instantly between 40+ supported languages.", category: 'New Features', group: 'AI Assistant', icon: '🌍' },
  { title: "Get chapter summaries instantly. 📚", body: "No time to read the full chapter? Generate smart summary bullet notes in one tap.", category: 'New Features', group: 'AI Assistant', icon: '📚' },
  { title: "AI Study Assistant is ready. ✨", body: "Your personalized mentor is updated and aligned with your curriculum syllabus.", category: 'New Features', group: 'AI Assistant', icon: '✨' },
  { title: "Personalized learning recommendations available. 🎯", body: "Discover customized focus topics chosen based on your recent practice response.", category: 'New Features', group: 'AI Assistant', group: 'AI Assistant', category: 'New Features', icon: '🎯' },
  { title: "Continue last AI conversation. 📖", body: "Pick up right where you left off on that science debate to master the concept.", category: 'New Features', group: 'AI Assistant', icon: '📖' },
  { title: "Discover new AI features. 🔍", body: "We've added smarter model parameters for accurate step-by-step problem-solving.", category: 'New Features', group: 'AI Assistant', icon: '🔍' },

  // Rewards & Credits
  { title: "Daily reward available! 🎁", body: "Your daily energy chest is full! Claim your free study credits right now.", category: 'Important Alerts', group: 'Rewards', icon: '🎁' },
  { title: "You earned 10 credits. 💰", body: "Awesome job on completing tasks! Use these to ask advanced AI homework questions.", category: 'Important Alerts', group: 'Rewards', icon: '💰' },
  { title: "Congratulations on your achievement! ⭐", body: "You've proven your dedication! Check your milestone badges in your profile.", category: 'Competition Announcements', group: 'Rewards', icon: '⭐' },
  { title: "New badge unlocked. 🏅", body: "Wear it with pride! You've unlocked the rare Consistent Learner emblem.", category: 'Competition Announcements', group: 'Rewards', icon: '🏅' },
  { title: "Learning milestone reached. 🎉", body: "You have completed over 15 quiz cycles successfully! Excellent commitment.", category: 'Competition Announcements', group: 'Rewards', icon: '🎉' },
  { title: "Your streak is now 7 days. 🔥", body: "Congratulations! You completed a full week of consistent learning without stopping.", category: 'Daily Streak Reminders', group: 'Rewards', icon: '🔥' },
  { title: "Complete tasks to earn credits. 🎯", body: "Daily assignments are ready. Complete them today to build up your gold reserves.", category: 'Important Alerts', group: 'Rewards', icon: '🎯' },
  { title: "Surprise reward waiting for you. 🎁", body: "Open the SJ Tutor app now to claim an exclusive bonus pack custom tailored for you.", category: 'Important Alerts', group: 'Rewards', icon: '🎁' },
  { title: "Premium feature unlocked. 💎", body: "Access limitless scanning, advanced AI models, and real-time support now.", category: 'New Features', group: 'Rewards', icon: '💎' },
  { title: "Top learners today! 🏆", body: "You've placed on the daily national leaderboard! Keep pushing to stay high-ranked.", category: 'Competition Announcements', group: 'Rewards', icon: '🏆' },

  // Groups & Community (Retained as customized simulation push presets as requested)
  { title: "New group invite received. 👥", body: "Your classmates are organizing a team challenge. Accept and join them today.", category: 'Competition Announcements', group: 'Groups', icon: '👥' },
  { title: "Someone joined your group. 🎉", body: "Your science study room has a new member ready to solve problems with you.", category: 'Competition Announcements', group: 'Groups', icon: '🎉' },
  { title: "New message in your group. 📢", body: "A brand new practice quiz link was shared in your class study chat dashboard.", category: 'Competition Announcements', group: 'Groups', icon: '📢' },
  { title: "Promoted to Admin. ⭐", body: "You are now managing the official class study circle. Curate materials and help others.", category: 'Important Alerts', group: 'Groups', icon: '⭐' },
  { title: "Group activity is increasing. 🔔", body: "Your friends are highly active today preparing for upcoming mock exams.", category: 'Competition Announcements', group: 'Groups', icon: '🔔' },
  { title: "Study session starting soon. 📚", body: "Ready your notebooks! Group revision session kicks off in the next 15 minutes.", category: 'Daily Streak Reminders', group: 'Groups', icon: '📚' },
  { title: "Friend sent request. 👋", body: "Add them to share daily streaks, challenge scores and track overall ranks.", category: 'Competition Announcements', group: 'Groups', icon: '👋' },
  { title: "Join trending study group. 🎯", body: "Discover other students studying the exact same subjects as you right now.", category: 'Competition Announcements', group: 'Groups', icon: '🎯' },
  { title: "New group announcement. 📢", body: "The admin of your group shared a vital notice about the upcoming revision timeline.", category: 'Important Alerts', group: 'Groups', icon: '📢' },
  { title: "Create study group today. 🚀", body: "Collaborate, share study notes, and compete with friends for milestone rewards together.", category: 'New Features', group: 'Groups', icon: '🚀' },

  // General Engagement
  { title: "Good morning! Ready to learn today? ☀️", body: "A brand new day is a blank slate. Start strong by practicing a brief 3-minute quiz.", category: 'Daily Streak Reminders', group: 'Engagement', icon: '☀️' },
  { title: "We missed you! Come back and learn. 🌟", body: "It's always a good time to resume your study plans. Your AI Tutor is waiting.", category: 'Daily Streak Reminders', group: 'Engagement', icon: '🌟' },
  { title: "Continue where you left off. 🎯", body: "Pick up your ongoing Mathematics lesson right now to lock in your scores.", category: 'Daily Streak Reminders', group: 'Engagement', icon: '🎯' },
  { title: "New content added today. 📚", body: "Fresh practice quizzes, boards sheets and flashcards are now available.", category: 'Quiz Updates', group: 'Engagement', icon: '📚' },
  { title: "Your next lesson is ready. ⚡", body: "SJ Tutor AI has curated a quick, bite-sized science concept analysis for you.", category: 'Daily Streak Reminders', group: 'Engagement', icon: '⚡' },
  { title: "Exciting updates available. 🎉", body: "Enjoy an ultra-fast scanning camera and comprehensive step breakdown solvers.", category: 'New Features', group: 'Engagement', icon: '🎉' },
  { title: "Students learning right now. 🔥", body: "Over 4,500 active students are currently prepping. Join the wave now!", category: 'Competition Announcements', group: 'Engagement', icon: '🔥' },
  { title: "Discover a new learning tip. 💡", body: "Active recall is the key to memory retention. Practice today to master this skill.", category: 'Daily Streak Reminders', group: 'Engagement', icon: '💡' },
  { title: "Update SJ Tutor AI for new features. 🚀", body: "Get the absolute latest AI improvements and smoothest mobile performance.", category: 'New Features', group: 'Engagement', icon: '🚀' },
  { title: "Thank you for learning with SJ Tutor AI! ❤️", body: "We're absolutely honored to be a part of your daily academic success journey.", category: 'Important Alerts', group: 'Engagement', icon: '❤️' },
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
    sendNotification
  } = useNotifications();

  // Filter Tabs
  const [activeFilter, setActiveFilter] = useState<'All' | NotificationCategory>('All');

  // Playground Search & Category Tags
  const [playgroundTab, setPlaygroundTab] = useState<'Learning' | 'AI Assistant' | 'Rewards' | 'Groups' | 'Engagement'>('Learning');
  const [searchQuery, setSearchQuery] = useState('');
  const [justSentId, setJustSentId] = useState<string | null>(null);

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

  // Handle preset notification release
  const handleTriggerPreset = async (preset: NotificationPreset, index: number) => {
    // 1. Prompt browser click fallback if they are ungranted
    if (permissionStatus !== 'granted') {
      const ok = await requestPermission();
      if (!ok) {
        console.warn('System notifications are blocked by browser settings - dispatching as software alert.');
      }
    }

    // 2. Dispatch
    const cleanSend = await sendNotification(preset.title, preset.body, preset.category, 'all');
    if (cleanSend) {
      setJustSentId(`${preset.group}-${index}`);
      setTimeout(() => setJustSentId(null), 2500);
    }
  };

  const filteredPresets = NOTIFICATION_IDEAS.filter(idea => {
    const matchesTab = idea.group === playgroundTab;
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          idea.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getPresetGroupIcon = (group: string) => {
    switch (group) {
      case 'Learning': return <BookOpen className="w-4 h-4" />;
      case 'AI Assistant': return <Sparkles className="w-4 h-4" />;
      case 'Rewards': return <Gift className="w-4 h-4" />;
      case 'Groups': return <Users className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-20">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left/Middle Column (Notifications Feed) - Spans 7 cols */}
        <div className="lg:col-span-7">
          
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

        {/* Right Sidebar Column (Playground + Stats) - Spans 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Push Notification Ideas Generator Playground */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-150 dark:border-slate-700 bg-gradient-to-r from-primary-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-600 animate-pulse" />
                Notification Idea Playground
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Click any of the 50 push notifications below to immediately fire/send it directly to your browser device!
              </p>
            </div>

            {/* Filter Group Tabs */}
            <div className="p-4 border-b border-slate-150 dark:border-slate-700">
              <div className="grid grid-cols-5 gap-1.5 mb-3 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl">
                {(['Learning', 'AI Assistant', 'Rewards', 'Groups', 'Engagement'] as const).map((group) => (
                  <button 
                    key={group}
                    onClick={() => setPlaygroundTab(group)}
                    className={`py-2 text-[10px] font-bold rounded-lg flex flex-col items-center gap-1 transition-all capitalize ${
                      playgroundTab === group 
                        ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-450 hover:text-slate-800'
                    }`}
                    title={`${group} Presets`}
                  >
                    {getPresetGroupIcon(group)}
                    <span className="hidden sm:inline">{group.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${playgroundTab} presets...`}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Presets List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 scrollbar-thin">
              {filteredPresets.length === 0 ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No matching ideas inside {playgroundTab}.
                </div>
              ) : (
                filteredPresets.map((preset, idx) => {
                  const uniquePresetId = `${preset.group}-${idx}`;
                  const isSentRecently = justSentId === uniquePresetId;

                  return (
                    <div 
                      key={uniquePresetId} 
                      className="p-4 flex gap-3 items-start justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      <div className="flex gap-2.5 items-start">
                        <span className="text-xl shrink-0 mt-0.5 select-none">{preset.icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-snug">
                            {preset.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                            {preset.body}
                          </p>
                          <span className="inline-block text-[9px] font-semibold text-slate-400 mt-1 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {preset.category}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleTriggerPreset(preset, idx)}
                        disabled={isSentRecently}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0 shadow-sm transition-all flex items-center gap-1 ${
                          isSentRecently 
                            ? 'bg-emerald-500 text-white cursor-default' 
                            : 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow'
                        }`}
                      >
                        {isSentRecently ? (
                          <>
                            <Check className="w-3 h-3" />
                            Sent!
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            Push
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-center text-[10px] text-slate-500 dark:text-slate-450 font-semibold uppercase tracking-wider">
              10 presets per tab • 50 ideas fully functional
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
                <span>We use Firestore & standard Service Worker Push to sync notifications seamlessly. Data is preserved across sessions and is accessible across all your devices.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
