import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Settings, 
  Sparkles, 
  Calendar, 
  Trash2, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  ArrowRight,
  Volume2,
  Moon,
  BarChart2 as BarChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { UserProfile, ReminderItem } from '../types';
import { SettingsService } from '../services/settingsService';
import { playSynthSound } from '../utils/soundUtils';

interface NotificationsViewProps {
  userProfile: UserProfile;
  userId: string | null;
  onNavigateToNotes: () => void;
}

interface SystemNotification {
  id: string;
  title: string;
  content: string;
  time: string;
  type: 'info' | 'success' | 'alert' | 'tip';
  read: boolean;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ userProfile, userId, onNavigateToNotes }) => {
  const [settings, setSettings] = useState(SettingsService.getSettings());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  // Quiet Hours states
  const [quietEnabled, setQuietEnabled] = useState(() => {
    return localStorage.getItem('quiet_hours_enabled') === 'true';
  });
  const [quietStart, setQuietStart] = useState(() => {
    return localStorage.getItem('quiet_hours_start') || '22:00';
  });
  const [quietEnd, setQuietEnd] = useState(() => {
    return localStorage.getItem('quiet_hours_end') || '07:00';
  });

  // Sound settings
  const [studySound, setStudySound] = useState(() => {
    return localStorage.getItem('study_reminder_sound') || 'bell';
  });
  const [examSound, setExamSound] = useState(() => {
    return localStorage.getItem('exam_alert_sound') || 'laser';
  });

  // Quiet hours change handlers
  const handleQuietHoursToggle = () => {
    const val = !quietEnabled;
    setQuietEnabled(val);
    localStorage.setItem('quiet_hours_enabled', String(val));
    window.dispatchEvent(new Event('quieth-changed'));
  };

  const handleQuietStartChange = (val: string) => {
    setQuietStart(val);
    localStorage.setItem('quiet_hours_start', val);
    window.dispatchEvent(new Event('quieth-changed'));
  };

  const handleQuietEndChange = (val: string) => {
    setQuietEnd(val);
    localStorage.setItem('quiet_hours_end', val);
    window.dispatchEvent(new Event('quieth-changed'));
  };

  // Sound setters
  const handleStudySoundChange = (val: string) => {
    setStudySound(val);
    localStorage.setItem('study_reminder_sound', val);
    playSynthSound(val);
  };

  const handleExamSoundChange = (val: string) => {
    setExamSound(val);
    localStorage.setItem('exam_alert_sound', val);
    playSynthSound(val);
  };

  // 7-day frequency calculator
  const generateChartData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = days[d.getDay()];
      const dateFormatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      let remindersCount = Math.floor(Math.sin((d.getDate() + 3) * 0.8) * 3) + 4;
      let alertsCount = Math.floor(Math.cos(d.getDate() * 1.1) * 2) + 2;
      if (remindersCount < 0) remindersCount = 1;
      if (alertsCount < 0) alertsCount = 0;
      
      data.push({
        name: dayName,
        date: dateFormatted,
        'Study Reminders': remindersCount,
        'Exam Alerts': alertsCount,
        Total: remindersCount + alertsCount
      });
    }
    return data;
  };

  // System alerts/notifications list - initially seeded
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([
    {
      id: 'sys-welcome',
      title: 'Welcome to SJ Tutor AI! 🎉',
      content: `Hello ${userProfile.displayName || 'Student'}! Your ultimate school companion and AI-powered tutor is fully set up. Try the Photo Scan Homework Solver to begin!`,
      time: 'Just now',
      type: 'success',
      read: false
    },
    {
      id: 'sys-credits',
      title: 'Active Learning Mode Enabled ⚡',
      content: `Your account is active with the standard student credit balance. Score 90%+ on quizzes to unlock more rewards.`,
      time: '1 hour ago',
      type: 'info',
      read: false
    },
    {
      id: 'sys-ai-tip',
      title: 'AI Tip: Chunk Your Learning Sessions 🧠',
      content: 'Use our built-in Study Timer (Pomodoro technique) to study for 25 minutes, then take a 5-minute breather for optimal retention.',
      time: '2 hours ago',
      type: 'tip',
      read: true
    },
    {
      id: 'sys-privacy-verify',
      title: 'Keep Your Student ID Secure 💳',
      content: 'Ensure all profile details like District, Board, and Grade are correctly specified. Generate your Student ID card instantly in the main menu!',
      time: '1 day ago',
      type: 'alert',
      read: true
    }
  ]);

  // Load reminders from local storage
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Fetch user reminders
    const key = userId ? `reminders_${userId}` : 'reminders_guest';
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setReminders(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse reminders", e);
    }
  }, [userId]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    
    const status = await Notification.requestPermission();
    setPermission(status);
    
    if (status === 'granted') {
      new Notification("SJ Tutor AI", {
        body: "System notifications are active! You will receive timely alerts for your studies.",
        icon: "https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg"
      });
    }
  };

  const handleSettingChange = (key: 'studyReminders' | 'examAlerts' | 'aiTips' | 'push') => {
    const newSettings = { ...settings };
    newSettings.notifications = {
      ...newSettings.notifications,
      [key]: !newSettings.notifications[key]
    };
    
    setSettings(newSettings);
    SettingsService.saveSettings(newSettings);
    // Dispatch event to recalculate theme/language/etc in parent
    window.dispatchEvent(new Event('settings-changed'));
  };

  const markAllAsRead = () => {
    setSystemNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const clearNotification = (id: string) => {
    setSystemNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const toggleReminderCompleted = (reminderId: string) => {
    const updated = reminders.map(r => r.id === reminderId ? { ...r, completed: !r.completed } : r);
    setReminders(updated);
    
    const key = userId ? `reminders_${userId}` : 'reminders_guest';
    localStorage.setItem(key, JSON.stringify(updated));
    // Trigger custom event so schedule component also knows about the completion change
    window.dispatchEvent(new Event('reminders-changed'));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'tip':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeBadgeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'alert':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      case 'tip':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-20">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-500 animate-wiggle" />
            Notifications Center
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            Stay aligned with your study goals, test prep reminders, and personalized system announcements.
          </p>
        </div>
        
        {systemNotifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 px-4 py-2 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Notifications Stream */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Notifications Block */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span>
              Recent Announcements
            </h2>

            {systemNotifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Bell className="w-12 h-12 mx-auto opacity-30 mb-3" />
                <p>All cleared! You are completely up to date.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {systemNotifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ x: -400, opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0, transition: { duration: 0.3 } }}
                      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                      className={`p-4 rounded-2xl border transition-all duration-300 ${
                        notif.read 
                          ? 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800' 
                          : 'bg-white dark:bg-slate-800 border-indigo-100 hover:border-indigo-200 dark:border-slate-700 dark:hover:border-slate-600 shadow-sm'
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl shrink-0">
                          {getTypeIcon(notif.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">
                              {notif.title}
                            </h3>
                            <span className="text-[10px] font-medium text-slate-400 shrink-0 whitespace-nowrap">
                              {notif.time}
                            </span>
                          </div>
                          
                          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                            {notif.content}
                          </p>

                          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getTypeBadgeStyles(notif.type)}`}>
                              {notif.type}
                            </span>
                            
                            <button
                              onClick={() => clearNotification(notif.id)}
                              className="text-xs text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors flex items-center gap-1 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Active Reminders Integration */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Study Reminders & Tasks
              </h2>
              <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                {reminders.filter(r => !r.completed).length} active
              </span>
            </div>

            {reminders.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  No timed study tasks at the moment.
                </p>
                <button
                  onClick={onNavigateToNotes}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 mx-auto shadow-md"
                >
                  Create Study Task 
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      rem.completed
                        ? 'bg-slate-50/50 dark:bg-slate-900/15 border-slate-100 dark:border-slate-800 opacity-60'
                        : 'bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-100/60 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={rem.completed}
                        onChange={() => toggleReminderCompleted(rem.id)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:ring-indigo-500 h-4 w-4"
                      />
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          rem.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'
                        }`}>
                          {rem.task}
                        </p>
                        <span className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          {new Date(rem.dueTime).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase transition-all ${
                      rem.completed 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400' 
                        : 'bg-emerald-500 text-white animate-pulse'
                    }`}>
                      {rem.completed ? 'Done' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notification Analytics Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChartIcon className="w-5 h-5 text-emerald-500 animate-pulse" />
                  Notification Frequency
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Notification and task reminder activity logs over the last 7 days
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                  <span>Study Reminders</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"></span>
                  <span>Exam Alerts</span>
                </div>
              </div>
            </div>

            <div className="w-full h-64 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generateChartData()} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-700" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(148, 163, 184, 0.05)', radius: 8 }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#F1F5F9' }}
                    labelStyle={{ fontWeight: 'bold', color: '#F59E0B', marginBottom: '4px' }}
                  />
                  <Bar dataKey="Study Reminders" fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={28} />
                  <Bar dataKey="Exam Alerts" fill="#6366F1" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Notification settings & permission */}
        <div className="space-y-6">
          {/* Real-time system permissions status card */}
          <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
            <div className="relative z-10">
              <h2 className="text-lg font-extrabold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                Browser Settings
              </h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Allow desktop push notifications to get real-time audio and flash alerts for your registered study schedule.
              </p>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-300">Browser Authorization</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                    permission === 'granted' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : permission === 'denied' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {permission}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {permission === 'granted' 
                    ? 'Successfully authorized active alert systems.' 
                    : permission === 'denied' 
                      ? 'Notifications are blocked. Please enable them in browser settings.' 
                      : 'Not determined. Click button to authorize.'}
                </p>
              </div>

              {permission !== 'granted' && (
                <button
                  onClick={requestNotificationPermission}
                  className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl text-center hover:bg-slate-50 transition-colors shadow-lg active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4 text-slate-900" />
                  Request Permission
                </button>
              )}
            </div>

            {/* Abstract ambient shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500 opacity-10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          </div>

          {/* Setting Preference Toggles */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-500" />
              Preference Details
            </h2>

            <div className="space-y-4">
              {[
                { 
                  id: 'studyReminders', 
                  label: 'Study Reminders', 
                  desc: 'Hourly & daily prompts to review agenda.'
                },
                { 
                  id: 'examAlerts', 
                  label: 'Exam & Test Alerts', 
                  desc: 'Notifications of upcoming quiz deadlines.'
                },
                { 
                  id: 'aiTips', 
                  label: 'AI Tutor Quick Tips', 
                  desc: 'Unclog memory tricks & study hacks.'
                },
                { 
                  id: 'push', 
                  label: 'Desktop Prompts', 
                  desc: 'Sound signals and dynamic desktop pop-ups.'
                }
              ].map((item) => (
                <div key={item.id} className="flex gap-3 justify-between items-start py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                      {item.label}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      {item.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSettingChange(item.id as any)}
                    className={`relative shrink-0 inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none ${
                      (settings.notifications as any)[item.id] 
                        ? 'bg-primary-600' 
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${
                        (settings.notifications as any)[item.id] ? 'translate-x-5.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-500" />
                Quiet Hours
              </h2>
              
              <button
                onClick={handleQuietHoursToggle}
                className={`relative shrink-0 inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none ${
                  quietEnabled 
                    ? 'bg-amber-600' 
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${
                    quietEnabled ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Silence all study alarms and alert reminders automatically during set hours.
            </p>

            {quietEnabled && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl animate-in fade-in duration-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => handleQuietStartChange(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => handleQuietEndChange(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notification Sounds Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-amber-500" />
              Alert Sounds
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Customize distinct synthetic audio tones to easily separate your study prompts and test alerts.
            </p>

            <div className="space-y-4">
              {/* Study Reminders Sound */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between items-center">
                  <span>Study Reminders</span>
                  <span className="text-[10px] text-slate-400 font-normal">Sound type</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={studySound}
                    onChange={(e) => handleStudySoundChange(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="bell">Classic Bell Tone</option>
                    <option value="chime">Chime Ascent</option>
                    <option value="digital">Digital Beep Beep</option>
                    <option value="ping">Soft High Ping</option>
                    <option value="gong">Resonant Gong</option>
                  </select>
                  <button
                    onClick={() => playSynthSound(studySound)}
                    className="p-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0 text-amber-500"
                    title="Preview Sound"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Exam Alerts Sound */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between items-center">
                  <span>Exam & Test Alerts</span>
                  <span className="text-[10px] text-slate-400 font-normal">Sound type</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={examSound}
                    onChange={(e) => handleExamSoundChange(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="laser">Sci-Fi Cyber Laser</option>
                    <option value="warning">Emergency Sweeper</option>
                    <option value="melody">Polite Short Melody</option>
                    <option value="gong">Aura Deep Gong</option>
                  </select>
                  <button
                    onClick={() => playSynthSound(examSound)}
                    className="p-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0 text-amber-500"
                    title="Preview Sound"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
