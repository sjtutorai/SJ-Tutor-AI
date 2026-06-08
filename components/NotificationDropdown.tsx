import React, { useRef, useEffect } from 'react';
import { Bell, Sparkles, Flame, Brain, Trophy, AlertTriangle, Check, ArrowRight, X, Info } from 'lucide-react';
import { useNotifications, NotificationCategory } from './NotificationContext';

interface NotificationDropdownProps {
  onClose: () => void;
  onNavigateToAll: () => void;
}

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  'New Features': <Sparkles className="w-4 h-4 text-violet-500" />,
  'Daily Streak Reminders': <Flame className="w-4 h-4 text-orange-500" />,
  'Quiz Updates': <Brain className="w-4 h-4 text-blue-500" />,
  'Competition Announcements': <Trophy className="w-4 h-4 text-amber-500" />,
  'Important Alerts': <AlertTriangle className="w-4 h-4 text-rose-500" />,
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose, onNavigateToAll }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Keep only the 4 most recent notifications
  const recentNotifications = notifications.slice(0, 4);

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-14 right-0 w-[360px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200"
    >
      {/* Dropdown Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4.5 h-4.5 text-primary-500" />
          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Recent Alerts</h4>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary-500 text-white font-extrabold text-[10px] min-w-4 text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={() => {
                markAllAsRead();
              }}
              className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5"
            >
              <Check className="w-3 h-3" />
              Mark All Read
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications scroll list */}
      <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mx-auto mb-2 text-slate-400">
              <Info className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold">No alerts yet</p>
            <p className="text-[10px] text-slate-400">We&apos;ll notify you when reminders arrive!</p>
          </div>
        ) : (
          recentNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.read) markAsRead(notif.id);
              }}
              className={`p-3.5 flex gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer ${
                notif.read ? 'opacity-70' : 'bg-primary-50/20 dark:bg-primary-950/5'
              }`}
            >
              {/* Icon indicator */}
              <div className="w-8.5 h-8.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-sm relative mt-0.5">
                {CATEGORY_ICONS[notif.category] || <Sparkles className="w-4 h-4 text-violet-500" />}
                {!notif.read && (
                  <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-primary-500" />
                )}
              </div>

              {/* Text detail */}
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-center gap-1 mb-0.5">
                  <span className="text-[9px] font-bold text-slate-400 capitalize">{notif.category}</span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h5 className={`text-xs text-slate-800 dark:text-white truncate ${!notif.read ? 'font-bold' : 'font-medium'}`}>
                  {notif.title}
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {notif.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View All Footer */}
      <button
        onClick={() => {
          onNavigateToAll();
          onClose();
        }}
        className="w-full p-3 border-t border-slate-100 dark:border-slate-700 text-center text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors flex items-center justify-center gap-1"
      >
        View Notification Center
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default NotificationDropdown;
