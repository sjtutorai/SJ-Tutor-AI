import React, { useState } from 'react';
import { 
  Bell, Sparkles, Flame, Brain, Trophy, AlertTriangle, 
  Check, Trash2, Info, Smartphone, SlidersHorizontal
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

interface NotificationIdea {
  title: string;
  body: string;
  category: NotificationCategory;
  group: string;
  icon: string;
}

const NOTIFICATION_IDEAS: NotificationIdea[] = [
  // Learning
  { title: "Time for today's lesson! 📖", body: "Spend just 10 minutes on SJ Tutor AI to expand your knowledge today.", category: "Daily Streak Reminders", group: "Learning", icon: "📖" },
  { title: "Complete your daily learning goal. 🎯", body: "You are only a few steps away from completing today's study target. Let's do it!", category: "Daily Streak Reminders", group: "Learning", icon: "🎯" },
  { title: "Keep your learning streak alive! 🔥", body: "Don't let your hard work go to waste! Jump back in and save your streak.", category: "Daily Streak Reminders", group: "Learning", icon: "🔥" },
  { title: "Try today's practice quiz. ✍️", body: "Quickly test your retention with today's custom-generated practice questionnaire.", category: "Quiz Updates", group: "Learning", icon: "✍️" },
  { title: "Learn something new in 5 minutes. 🧠", body: "Get a quick bite-sized AI lesson customized just for your grade level.", category: "Quiz Updates", group: "Learning", icon: "🧠" },
  { title: "New study material is available. 📚", body: "Fresh textbook summaries and notes have been generated for your subjects.", category: "New Features", group: "Learning", icon: "📚" },
  { title: "Ready for a quick revision? 🎓", body: "Review your recent mistakes to lock in maximum exam preparation.", category: "Quiz Updates", group: "Learning", icon: "🎓" },
  { title: "Complete a chapter and earn rewards. ⭐", body: "Solve the chapter quiz now and unlock bonus SJ study credits.", category: "Competition Announcements", group: "Learning", icon: "⭐" },
  { title: "Your homework is waiting. 📝", body: "Your AI tutor prepared some quick exercises to finalize your latest topic.", category: "Daily Streak Reminders", group: "Learning", icon: "📝" },
  { title: "Start learning now. 🚀", body: "Fuel your academic success with a quick session right now.", category: "New Features", group: "Learning", icon: "🚀" },

  // AI Assistant
  { title: "Ask SJ Tutor AI anything. 🤖", body: "Confused about homework? Ask me any algebra, history, or science question.", category: "New Features", group: "AI Assistant", icon: "🤖" },
  { title: "Need help with a difficult question? 💡", body: "SJ Tutor AI is standing by. Get complex equations solved with voice and text.", category: "New Features", group: "AI Assistant", icon: "💡" },
  { title: "Scan your textbook and get answers. 📸", body: "Use your device camera to upload any question sheet and get full explanations.", category: "New Features", group: "AI Assistant", icon: "📸" },
  { title: "Solve math problems instantly. 🧮", body: "Step-by-step calculus, trigonometry, and equation solvers are ready to assist you.", category: "New Features", group: "AI Assistant", icon: "🧮" },
  { title: "Translate text with AI. 🌍", body: "Overcome language barriers instantly with high-fidelity multilingual translation.", category: "New Features", group: "AI Assistant", icon: "🌍" },
  { title: "Get chapter summaries instantly. 📚", body: "Summarize huge chapters into easy bullet points to save hours of prep time.", category: "New Features", group: "AI Assistant", icon: "📚" },
  { title: "AI Study Assistant is ready. ✨", body: "Experience the ultimate personalized digital tutoring companion on your phone.", category: "New Features", group: "AI Assistant", icon: "✨" },
  { title: "Personalized learning recommendations available. 🎯", body: "Your AI customized study syllabus has been revised based on your mock results.", category: "New Features", group: "AI Assistant", icon: "🎯" },
  { title: "Continue your last AI conversation. 📖", body: "Resume your interactive study conversation right where you paused.", category: "New Features", group: "AI Assistant", icon: "📖" },
  { title: "Discover new AI features. 🔍", body: "Explore our newly released mock exam simulators & smart summaries widget.", category: "New Features", group: "AI Assistant", icon: "🔍" },

  // Rewards & Credits
  { title: "Daily reward available! 🎁", body: "Claim your free daily streak credits to ask more premium AI questions.", category: "Important Alerts", group: "Rewards", icon: "🎁" },
  { title: "You earned 10 credits. 💰", body: "Credits have been credited to your SJ Tutor account balance. Great job!", category: "Important Alerts", group: "Rewards", icon: "💰" },
  { title: "Congratulations on your achievement! ⭐", body: "You have unlocked the Bronze Study star emblem for your virtual ID card.", category: "Competition Announcements", group: "Rewards", icon: "⭐" },
  { title: "New badge unlocked. 🏅", body: "Verify your new 'Consistent Scholar' badge on your public profile tab.", category: "Competition Announcements", group: "Rewards", icon: "🏅" },
  { title: "Learning milestone reached. 🎉", body: "Fantastic! You completed your 5th full-length AI MCQ module this month.", category: "Competition Announcements", group: "Rewards", icon: "🎉" },
  { title: "Your streak is now 7 days. 🔥", body: "Incredible commitment! Keep the fire burning to unlock gold rewards.", category: "Daily Streak Reminders", group: "Rewards", icon: "🔥" },
  { title: "Complete tasks to earn credits. 🎯", body: "Earn extra bonus credits by setting up your school and class settings.", category: "Competition Announcements", group: "Rewards", icon: "🎯" },
  { title: "Surprise reward waiting for you. 🎁", body: "Crack open today's lockbox to find surprise points, badges, and tokens.", category: "Important Alerts", group: "Rewards", icon: "🎁" },
  { title: "Premium feature unlocked. 💎", body: "Congratulations! You have received a premium expansion. Enjoy advanced AI modes.", category: "New Features", group: "Rewards", icon: "💎" },
  { title: "You're among the top learners today! 🏆", body: "You made it onto the global daily leaderboard. Keep studying to stay on top!", category: "Competition Announcements", group: "Rewards", icon: "🏆" },

  // Groups & Community
  { title: "New group invite received. 👥", body: "Your classmate invited you to join the Grade 10 Science quiz chamber.", category: "Competition Announcements", group: "Community", icon: "👥" },
  { title: "Someone joined your group. 🎉", body: "A new student joined your study lobby. Start collaborating and studying!", category: "Competition Announcements", group: "Community", icon: "🎉" },
  { title: "New message in your group. 📢", body: "Your study team is discussing tough assignment equations. Don't miss out.", category: "Competition Announcements", group: "Community", icon: "📢" },
  { title: "You have been promoted to Admin. ⭐", body: "You are now Admin! Create mock quizzes and invite classmates.", category: "Competition Announcements", group: "Community", icon: "⭐" },
  { title: "Group activity is increasing. 🔔", body: "Members are actively scanning textbooks and discussing answers right now.", category: "Competition Announcements", group: "Community", icon: "🔔" },
  { title: "Study session starting soon. 📚", body: "Your group's Scheduled Math revision is locked for today. Get ready!", category: "Competition Announcements", group: "Community", icon: "📚" },
  { title: "A friend sent you a request. 👋", body: "Accept their friend request. Compare streaks and quiz achievements.", category: "Competition Announcements", group: "Community", icon: "👋" },
  { title: "Join a trending study group. 🎯", body: "Study with top performing pupils in Chemistry and physics lobbies.", category: "Competition Announcements", group: "Community", icon: "🎯" },
  { title: "New announcement from your group. 📢", body: "The admin pinned a new challenge. Achieve 100% on the quiz to complete.", category: "Competition Announcements", group: "Community", icon: "📢" },
  { title: "Create a study group today. 🚀", body: "Form a revision squad with your peers to share scores, summaries, and files.", category: "Competition Announcements", group: "Community", icon: "🚀" },

  // General Engagement
  { title: "Good morning! Ready to learn today? ☀️", body: "Kickstart your brain with a healthy morning revision module on SJ Tutor.", category: "Daily Streak Reminders", group: "Engagement", icon: "☀️" },
  { title: "We missed you! Come back and learn. 🌟", body: "Every small lesson gets you closer to your exam targets. See you soon!", category: "Daily Streak Reminders", group: "Engagement", icon: "🌟" },
  { title: "Continue where you left off. 🎯", body: "Finish the remaining MCQ quiz questions on your active tab.", category: "Quiz Updates", group: "Engagement", icon: "🎯" },
  { title: "New content added today. 📚", body: "Relevant question sheets have been updated according to latest curricula.", category: "New Features", group: "Engagement", icon: "📚" },
  { title: "Your next lesson is ready. ⚡", body: "Based on yesterday's topic, we have unlocked your next customized step.", category: "Quiz Updates", group: "Engagement", icon: "⚡" },
  { title: "Exciting updates available. 🎉", body: "Faster chat bots, a lighter UI, and full-screen exam mode have arrived.", category: "New Features", group: "Engagement", icon: "🎉" },
  { title: "Students are learning right now. 🔥", body: "Over 5,000 active students are testing their skills. Don't fall behind!", category: "Daily Streak Reminders", group: "Engagement", icon: "🔥" },
  { title: "Discover a new learning tip. 💡", body: "Studying in 25-minute Pomodoro bursts with AI can double your retention.", category: "New Features", group: "Engagement", icon: "💡" },
  { title: "Update SJ Tutor AI for new features. 🚀", body: "Ensure your application and offline cache is up-to-date for smooth access.", category: "New Features", group: "Engagement", icon: "🚀" },
  { title: "Thank you for learning with SJ Tutor AI. ❤️", body: "We are thrilled to be part of your academic growth. Explore more with us today!", category: "New Features", group: "Engagement", icon: "❤️" }
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

  // Push Simulator Tabs / state
  const [selectedGrp, setSelectedGrp] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'All') return true;
    return n.category === activeFilter;
  });

  const filteredIdeas = NOTIFICATION_IDEAS.filter(idea => {
    const matchesGrp = selectedGrp === 'All' || idea.group === selectedGrp;
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          idea.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrp && matchesSearch;
  });

  const categories: ('All' | NotificationCategory)[] = [
    'All',
    'New Features',
    'Daily Streak Reminders',
    'Quiz Updates',
    'Competition Announcements',
    'Important Alerts'
  ];

  const handleSendIdea = async (idea: NotificationIdea) => {
    await sendNotification(idea.title, idea.body, idea.category, 'all');
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
        <div className="flex gap-2 text-left">
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
          <div className="flex items-start gap-3.5 text-left">
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
                      className={`group relative overflow-hidden rounded-2xl border text-left ${styles.border} ${styles.bg} p-5 transition-all duration-300 hover:shadow-md cursor-pointer flex gap-4 ${
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
        <div className="space-y-6 text-left">
          
          {/* Push Broadcast Simulator (50 Ideas) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[525px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-slate-950 dark:text-white text-base flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-500 animate-bounce" />
                Notification Sender
              </h3>
              <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                50 Ideas
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Dispatch any of the 50 push notifications directly to this device as an instant OS-level system alert.
            </p>

            {/* Filter segments */}
            <div className="flex gap-1 overflow-x-auto pb-2 shrink-0 scrollbar-none border-b border-slate-100 dark:border-slate-700">
              {['All', 'Learning', 'AI Assistant', 'Rewards', 'Community', 'Engagement'].map((grp) => (
                <button
                  key={grp}
                  onClick={() => setSelectedGrp(grp)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition-all ${
                    selectedGrp === grp 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>

            {/* Search filter */}
            <div className="relative my-3 shrink-0">
              <input
                type="text"
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-705 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
              />
            </div>

            {/* Scrollable container of ideas */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {filteredIdeas.map((idea, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-750 bg-slate-50/55 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors flex items-start gap-2.5 group relative"
                >
                  <span className="text-base shrink-0 select-none mt-0.5">{idea.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{idea.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-0.5">{idea.body}</p>
                    <span className="text-[8px] font-extrabold text-indigo-500 dark:text-indigo-400 block mt-1 uppercase tracking-wider">{idea.category}</span>
                  </div>
                  
                  <button
                    onClick={() => handleSendIdea(idea)}
                    className="p-1 px-1.5 self-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-md shadow-indigo-500/10 active:scale-95 transition-all text-center flex items-center gap-1 shrink-0 whitespace-nowrap opacity-90 group-hover:opacity-100"
                  >
                    Send 🚀
                  </button>
                </div>
              ))}

              {filteredIdeas.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-400 font-bold">No notifications found.</p>
                </div>
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
