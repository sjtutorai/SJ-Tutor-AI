import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  Check, 
  Trash2, 
  AlertCircle, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  Plus, 
  Settings, 
  Volume2, 
  VolumeX,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, ReminderItem } from '../types';
import { SettingsService } from '../services/settingsService';
import { 
  isPushSupported, 
  registerServiceWorkerAndSubscribe, 
  syncRemindersWithServer, 
  sendTestPush, 
  getSubscription 
} from '../src/utils/pushNotifications';

interface NotificationsViewProps {
  userProfile: UserProfile;
  userId: string | null;
}

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'system' | 'study' | 'achievement' | 'alert';
  read: boolean;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ userProfile, userId }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'reminders'>('all');
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [localReminders, setLocalReminders] = useState<ReminderItem[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [settings, setSettings] = useState(() => SettingsService.getSettings());
  const [showToast, setShowToast] = useState<{ show: boolean; title: string; message: string } | null>(null);

  const remindersKey = userId ? `reminders_${userId}` : 'reminders_guest';

  // Background Push States
  const [isPushAvailable, setIsPushAvailable] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);

  // Monitor subscription status on load
  useEffect(() => {
    const checkPushStatus = async () => {
      const supported = isPushSupported();
      setIsPushAvailable(supported);
      if (supported) {
        try {
          const sub = await getSubscription();
          setIsSubscribed(!!sub);
        } catch (e) {
          console.warn("Subscription retrieval check skipped (common in sandboxed iframes):", e);
        }
      }
    };
    checkPushStatus();
  }, []);

  const handleDeviceRegister = async () => {
    setPushLoading(true);
    try {
      const sub = await registerServiceWorkerAndSubscribe(userId);
      setIsSubscribed(!!sub);
      setShowToast({
        show: true,
        title: "Device Registered Successfully! 📱",
        message: "This device can now receive study notifications even when the website is closed!"
      });
      setTimeout(() => setShowToast(null), 4500);
    } catch (err: any) {
      alert("Device registration failed: " + (err.message || err));
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setTestPushLoading(true);
    try {
      const success = await sendTestPush(
        userId,
        "SJ Tutor AI ⏰",
        "Brilliant! Device delivery completed. This background notification works even when the app is completely closed!"
      );
      if (success) {
        setShowToast({
          show: true,
          title: "Test Dispatched! 🚀",
          message: "A test push is on its way. You can close this tab and see it arrive!"
        });
        setTimeout(() => setShowToast(null), 4500);
      } else {
        alert("Server failed to dispatch the push. Verify you granted notification permission and registered the device!");
      }
    } catch (err: any) {
      alert("Error sending test push: " + (err.message || err));
    } finally {
      setTestPushLoading(false);
    }
  };

  // Load notifications and reminders
  useEffect(() => {
    // Load local storage custom notifications if any, else populate default simulated real-time events
    const notifsKey = userId ? `notifications_feed_${userId}` : 'notifications_feed_guest';
    const storedNotifs = localStorage.getItem(notifsKey);
    if (storedNotifs) {
      try {
        setInAppNotifications(JSON.parse(storedNotifs));
      } catch (e) {
        setInAppNotifications(getDefaultNotifications());
      }
    } else {
      const defaults = getDefaultNotifications();
      setInAppNotifications(defaults);
      localStorage.setItem(notifsKey, JSON.stringify(defaults));
    }

    // Load active reminders
    const loadReminders = () => {
      const storedReminders = localStorage.getItem(remindersKey);
      if (storedReminders) {
        try {
          setLocalReminders(JSON.parse(storedReminders));
        } catch (e) {
          setLocalReminders([]);
        }
      } else {
        setLocalReminders([]);
      }
    };

    loadReminders();

    // Listen to changes in reminders or settings
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === remindersKey) {
        loadReminders();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userId, remindersKey]);

  const getDefaultNotifications = (): InAppNotification[] => [
    {
      id: 'notif-1',
      title: 'Welcome to Real-Time Updates!',
      message: 'Experience live study progress, achievements, and smart alerts instantly.',
      timestamp: Date.now() - 60000 * 5, // 5 min ago
      type: 'system',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Study Reward Unlocked 🏆',
      message: 'You unlocked a credit bonus challenge! Score 75% or higher on a Hard quiz to claim it.',
      timestamp: Date.now() - 60000 * 30, // 30 min ago
      type: 'achievement',
      read: false
    },
    {
      id: 'notif-3',
      title: 'Exam Season Commenced 🎓',
      message: 'Study smart with customized AI guides for your current grade syllabus.',
      timestamp: Date.now() - 3600000 * 2, // 2 hours ago
      type: 'alert',
      read: true
    }
  ];

  const saveNotifications = (updated: InAppNotification[]) => {
    setInAppNotifications(updated);
    const notifsKey = userId ? `notifications_feed_${userId}` : 'notifications_feed_guest';
    localStorage.setItem(notifsKey, JSON.stringify(updated));
  };

  // Sound generator
  const playNotificationSound = () => {
    if (!isSoundEnabled) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, context.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, context.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, context.currentTime + 0.2); // G5
      
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
      
      osc.start();
      osc.stop(context.currentTime + 0.45);
    } catch (e) {
      // Audio context error or blocked
    }
  };

  // Real-time Simulation Alert Trigger
  const triggerSimulation = () => {
    const simulationPool = [
      {
        title: 'New Study Smart Tip 💡',
        message: 'Review formulas for 10 minutes right after study sessions to double knowledge retention.',
        type: 'system' as const
      },
      {
        title: 'Streak Alert 🔥',
        message: 'Excellent consistency! Keep learning to protect your study streak.',
        type: 'achievement' as const
      },
      {
        title: 'Academic Alert ⚠️',
        message: 'Your study goal for today is 30% complete. Continue to stay ahead!',
        type: 'alert' as const
      }
    ];

    const randomChoice = simulationPool[Math.floor(Math.random() * simulationPool.length)];
    const newNotif: InAppNotification = {
      id: `sim-${Date.now()}`,
      title: randomChoice.title,
      message: randomChoice.message,
      timestamp: Date.now(),
      type: randomChoice.type,
      read: false
    };

    const updated = [newNotif, ...inAppNotifications];
    saveNotifications(updated);
    playNotificationSound();

    // Trigger standard browser Notification if permitted
    if ('Notification' in window && Notification.permission === 'granted' && settings.notifications.push) {
      new Notification(randomChoice.title, {
        body: randomChoice.message,
        icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg'
      });
    }

    // Trigger an exquisite in-app Toast
    setShowToast({
      show: true,
      title: randomChoice.title,
      message: randomChoice.message
    });
    setTimeout(() => {
      setShowToast(null);
    }, 4500);
  };

  const markAllRead = () => {
    const updated = inAppNotifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearAllNotifications = () => {
    // Only clears simulated system notifications
    saveNotifications([]);
  };

  const toggleReadStatus = (id: string) => {
    const updated = inAppNotifications.map(n => n.id === id ? { ...n, read: !n.read } : n);
    saveNotifications(updated);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = inAppNotifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  // Reminder management
  const toggleReminderCompleted = (id: string) => {
    const updated = localReminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
    setLocalReminders(updated);
    localStorage.setItem(remindersKey, JSON.stringify(updated));
    // Dispatch event to update other views like NotesView
    window.dispatchEvent(new Event('storage'));
    
    // Sync reminders backend push channel
    syncRemindersWithServer(userId, updated);
  };

  const deleteReminder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = localReminders.filter(r => r.id !== id);
    setLocalReminders(updated);
    localStorage.setItem(remindersKey, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    
    // Sync reminders backend push channel
    syncRemindersWithServer(userId, updated);
  };

  // Notification Settings Fast-Toggler
  const handleToggleSetting = (key: 'studyReminders' | 'examAlerts' | 'aiTips' | 'push') => {
    const updatedSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key]
      }
    };
    setSettings(updatedSettings);
    SettingsService.saveSettings(updatedSettings);
    window.dispatchEvent(new Event('settings-changed'));

    // Request permissions and register service worker subscription if user turned push on
    if (key === 'push' && updatedSettings.notifications.push) {
      if ('Notification' in window) {
        import('../src/utils/pushNotifications').then(({ registerServiceWorkerAndSubscribe }) => {
          registerServiceWorkerAndSubscribe(userId).catch(err => {
            console.warn("Skipped or failed to register and subscribe device push subscription (can occur in iframe environments):", err);
          });
        });
      }
    }
  };

  // Filter lists based on tab
  const getFilteredItems = () => {
    if (activeTab === 'alerts') {
      return inAppNotifications;
    }
    if (activeTab === 'reminders') {
      return []; //handled separately to list all
    }
    return inAppNotifications;
  };

  const filteredNotifs = getFilteredItems();
  const unreadCount = inAppNotifications.filter(n => !n.read).length;
  const activeRemindersCount = localReminders.filter(r => !r.completed).length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-20">
      
      {/* Dynamic Toast Alert */}
      <AnimatePresence>
        {showToast && showToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-[60] max-w-sm w-full bg-slate-900 border border-amber-500/20 shadow-2xl p-4 rounded-2xl flex gap-3 text-white backdrop-blur-md"
          >
            <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/10">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-sm text-yellow-400">{showToast.title}</h5>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{showToast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <div className="relative">
              <Bell className="w-8 h-8 text-primary-600" />
              {unreadCount + activeRemindersCount > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
              )}
            </div>
            Real-Time Notifications
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Keep track of live updates, reminders, study streaks, and personal achievements immediately.
          </p>
        </div>

        <div className="flex items-center gap-2自 justify-start sm:justify-end">
          <button
            onClick={triggerSimulation}
            className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold flex items-center gap-2 text-sm shadow-md shadow-primary-500/10 transition-all hover:-translate-y-0.5"
            id="trigger-live-notification-btn"
          >
            <Sparkles className="w-4 h-4" />
            Simulate Live Alert
          </button>
          
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors"
            title={isSoundEnabled ? "Disable Notification Sound" : "Enable Notification Sound"}
          >
            {isSoundEnabled ? <Volume2 className="w-5 h-5 text-emerald-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              All Notifications ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'alerts' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              System Alerts
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'reminders' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
              Due Reminders ({activeRemindersCount})
            </button>
          </div>

          <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            <span>{activeTab === 'reminders' ? 'Your Schedule Reminders' : 'Recent Updates'}</span>
            <div className="flex gap-4">
              {activeTab !== 'reminders' && inAppNotifications.length > 0 && (
                <>
                  <button onClick={markAllRead} className="hover:text-primary-600 transition-colors">Mark all read</button>
                  <button onClick={clearAllNotifications} className="hover:text-red-500 transition-colors flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {/* If active tab is Reminders */}
              {activeTab === 'reminders' && (
                localReminders.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
                  >
                    <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">No active study reminders</h4>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto mt-2">
                      Add custom reminders inside the {"Notes & Schedule"} tab to receive live sound and push notifications.
                    </p>
                  </motion.div>
                ) : (
                  localReminders.map((reminder) => (
                    <motion.div
                      key={reminder.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 rounded-xl border transition-all ${reminder.completed ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-850 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleReminderCompleted(reminder.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${reminder.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-primary-500'}`}
                          >
                            {reminder.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <div>
                            <p className={`font-semibold text-sm ${reminder.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                              {reminder.task}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-primary-400" />
                              {new Date(reminder.dueTime).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <button 
                          onClick={(e) => deleteReminder(reminder.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )
              )}

              {/* If active tab is all or system alerts */}
              {activeTab !== 'reminders' && (
                filteredNotifs.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700"
                  >
                    <BellRing className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Clean slate!</h4>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto mt-2">
                      No notifications to show. Click {"Simulate Live Alert"} above to fire a sample updates log event!
                    </p>
                  </motion.div>
                ) : (
                  filteredNotifs.map((notif) => (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      onClick={() => toggleReadStatus(notif.id)}
                      className={`p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all flex gap-4 ${notif.read ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-850 opacity-75' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm border-l-4 border-l-primary-500'}`}
                    >
                      <div className={`p-2.5 h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        notif.type === 'achievement' ? 'bg-amber-50 dark:bg-slate-700 text-amber-500' :
                        notif.type === 'alert' ? 'bg-rose-50 dark:bg-slate-700 text-rose-500' :
                        'bg-blue-50 dark:bg-slate-700 text-blue-500'
                      }`}>
                        {notif.type === 'achievement' ? <Sparkles className="w-5 h-5 animate-pulse" /> :
                         notif.type === 'alert' ? <AlertCircle className="w-5 h-5" /> :
                         <Bell className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-bold text-sm truncate ${notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 font-medium">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-xs ${notif.read ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'} leading-relaxed`}>
                          {notif.message}
                        </p>
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        <button
                          onClick={(e) => deleteNotification(notif.id, e)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Configurations Side Cards */}
        <div className="space-y-6">
          
          {/* Settings Sync card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary-500" />
              Notification Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label htmlFor="toggle-push-notifications" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Push Notifications</label>
                  <p className="text-[10px] text-slate-400 leading-tight">Enable real-time push alerts on this device</p>
                </div>
                <input
                  id="toggle-push-notifications"
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={() => handleToggleSetting('push')}
                  className="w-10 h-5 bg-slate-200 rounded-full appearance-none cursor-pointer relative checked:bg-primary-600 before:content-[''] before:absolute before:h-4 before:w-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-all checked:before:translate-x-5 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-50 dark:border-slate-700/50 pt-3">
                <div>
                  <label htmlFor="toggle-study-reminders" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Study Reminders</label>
                  <p className="text-[10px] text-slate-400 leading-tight">Notify about scheduled notes & routines</p>
                </div>
                <input
                  id="toggle-study-reminders"
                  type="checkbox"
                  checked={settings.notifications.studyReminders}
                  onChange={() => handleToggleSetting('studyReminders')}
                  className="w-10 h-5 bg-slate-200 rounded-full appearance-none cursor-pointer relative checked:bg-primary-600 before:content-[''] before:absolute before:h-4 before:w-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-all checked:before:translate-x-5 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-50 dark:border-slate-700/50 pt-3">
                <div>
                  <label htmlFor="toggle-exam-alerts" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Exam Alerts</label>
                  <p className="text-[10px] text-slate-400 leading-tight">Important announcements & test periods</p>
                </div>
                <input
                  id="toggle-exam-alerts"
                  type="checkbox"
                  checked={settings.notifications.examAlerts}
                  onChange={() => handleToggleSetting('examAlerts')}
                  className="w-10 h-5 bg-slate-200 rounded-full appearance-none cursor-pointer relative checked:bg-primary-600 before:content-[''] before:absolute before:h-4 before:w-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-all checked:before:translate-x-5 shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-50 dark:border-slate-700/50 pt-3">
                <div>
                  <label htmlFor="toggle-ai-tips" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">AI Smart Tips</label>
                  <p className="text-[10px] text-slate-400 leading-tight">Daily personalized memory hints</p>
                </div>
                <input
                  id="toggle-ai-tips"
                  type="checkbox"
                  checked={settings.notifications.aiTips}
                  onChange={() => handleToggleSetting('aiTips')}
                  className="w-10 h-5 bg-slate-200 rounded-full appearance-none cursor-pointer relative checked:bg-primary-600 before:content-[''] before:absolute before:h-4 before:w-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-all checked:before:translate-x-5 shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Background Device Notifications Registration Card */}
          <div className="bg-slate-50 dark:bg-slate-800/45 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/70 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              Background Device Setup
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To receive instant study triggers on your computer or phone <strong className="text-slate-900 dark:text-slate-100">even when the website is closed</strong>, register this device to our persistent push server.
            </p>

            <div className="flex flex-col gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Push-Manager Support:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${isPushAvailable ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                  {isPushAvailable ? 'SUPPORTED' : 'UNSUPPORTED'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-2 mt-1">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Your Device Connection:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${isSubscribed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                  {isSubscribed ? '🟢 REGISTERED & ACTIVE' : '🔴 NOT CONNECTED'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                disabled={pushLoading}
                onClick={handleDeviceRegister}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-primary-600 hover:border-primary-700"
              >
                {pushLoading ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent"></span>
                ) : isSubscribed ? (
                  'Re-register Device / Update Sync'
                ) : (
                  'Register This Device Now'
                )}
              </button>

              {isSubscribed && (
                <button
                  disabled={testPushLoading}
                  onClick={handleSendTestPush}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {testPushLoading ? (
                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-700 dark:border-slate-200 border-t-transparent"></span>
                  ) : (
                    '⚡ Send Test Background Push'
                  )}
                </button>
              )}
            </div>
            
            {isSubscribed && (
              <p className="text-[10px] text-center italic text-amber-600 dark:text-amber-400">
                ⭐ Test tip: Click the test button, then close your browser immediately to watch the push arrive!
              </p>
            )}
          </div>


          {/* Quick Stats / Info Banner */}
          <div className="bg-gradient-to-tr from-primary-600 to-primary-700 rounded-2xl p-6 text-white relative overflow-hidden shadow-md shadow-primary-500/10">
            <h3 className="font-extrabold text-lg mb-2 relative z-10">Real-Time Sync Engine</h3>
            <p className="text-primary-100 text-xs mb-4 leading-relaxed relative z-10">
              System schedules and background reminders are verified live every 10 seconds. Your learning patterns are prioritized dynamically!
            </p>
            <div className="flex gap-4 relative z-10">
              <div className="flex-1 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-primary-200 uppercase tracking-widest block">In Queue</span>
                <span className="text-xl font-extrabold">{activeRemindersCount}</span>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-primary-200 uppercase tracking-widest block">Feed Health</span>
                <span className="text-xl font-extrabold flex items-center gap-1">
                  100%
                </span>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-[0.03] rounded-full -mr-10 -mt-10 blur-xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-900 opacity-[0.05] rounded-full -ml-16 -mb-16 blur-2xl"></div>
          </div>

        </div>

      </div>

    </div>
  );
};
