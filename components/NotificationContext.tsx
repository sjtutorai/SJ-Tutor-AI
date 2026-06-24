import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, query, addDoc, doc, updateDoc, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { User, onAuthStateChanged } from 'firebase/auth';

export type NotificationCategory = 'New Features' | 'Daily Streak Reminders' | 'Quiz Updates' | 'Competition Announcements' | 'Important Alerts';

export interface NotificationItem {
  id: string;
  userId: string; // 'all' or actual user UID
  title: string;
  body: string;
  category: NotificationCategory;
  timestamp: number;
  read: boolean;
}

interface NotificationContextProps {
  notifications: NotificationItem[];
  unreadCount: number;
  permissionStatus: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  sendNotification: (title: string, body: string, category: NotificationCategory, targetUser: string) => Promise<boolean>;
  isAdminUser: boolean;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'seed-1',
    userId: 'all',
    title: 'Welcome to your brand-new Notification Center! 🔔',
    body: 'Say hello to the all-new SJ Tutor AI Notification Center. Track your quiz challenges, daily reminders, alerts, and feature updates right here.',
    category: 'New Features',
    timestamp: Date.now() - 3600000 * 2, // 2 hours ago
    read: false,
  },
  {
    id: 'seed-2',
    userId: 'all',
    title: 'Daily Streak Challenge Active 🔥',
    body: 'Complete your daily learning goal of 30 minutes. Keep your streak alive to unlock free premium credits!',
    category: 'Daily Streak Reminders',
    timestamp: Date.now() - 3600000 * 5, // 5 hours ago
    read: false,
  },
  {
    id: 'seed-3',
    userId: 'all',
    title: 'Double-Credit MCQ Science Challenge 🧪',
    body: 'A mock science test series is now available on your Quiz Creator tab. Pass with 90% or above to claim 50 free credits.',
    category: 'Quiz Updates',
    timestamp: Date.now() - 86400000, // 1 day ago
    read: false,
  },
  {
    id: 'seed-4',
    userId: 'all',
    title: 'National SJ AI Olympiad 2026! 🚀',
    body: 'Early bird registration is open for the SJ AI Olympiad. Test your skills against students nationwide and win exciting cash scholarships!',
    category: 'Competition Announcements',
    timestamp: Date.now() - 86400000 * 2, // 2 days ago
    read: true,
  }
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  // Determine if current user is admin (sjtutorai@gmail.com)
  const isAdminUser = currentUser?.email === 'sjtutorai@gmail.com';

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Sync / load notifications
  useEffect(() => {
    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    const localReadIdsKey = currentUser ? `read_global_ids_${currentUser.uid}` : 'read_global_ids_guest';
    
    // 1. Get initial notifications from LocalStorage or seed if empty
    let initialLocal: NotificationItem[] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        initialLocal = JSON.parse(stored);
      } else {
        initialLocal = SEED_NOTIFICATIONS;
        localStorage.setItem(storageKey, JSON.stringify(SEED_NOTIFICATIONS));
      }
    } catch {
      initialLocal = SEED_NOTIFICATIONS;
    }

    setNotifications(initialLocal);

    // Initialize seen IDs so we don't alert old notifications on startup
    const loadedIds = new Set(initialLocal.map(n => n.id));
    seenNotificationIdsRef.current = loadedIds;

    let active = true;
    let unsubDirect: (() => void) | null = null;
    let unsubGlobal: (() => void) | null = null;

    let currentDirect: NotificationItem[] = [];
    let currentGlobal: NotificationItem[] = [];

    const mergeAndStore = () => {
      if (!active) return;

      // Filter local storage items that are purely local (e.g. seeds / custom locally sent ones)
      let storedLocalItems: NotificationItem[] = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          storedLocalItems = JSON.parse(stored).filter((n: NotificationItem) => 
            n.id.startsWith('local-') || n.id.startsWith('seed-')
          );
        }
      } catch {
        storedLocalItems = SEED_NOTIFICATIONS;
      }

      // Read global read lists from local storage
      let readGlobalIds: string[] = [];
      try {
        const rawRead = localStorage.getItem(localReadIdsKey);
        if (rawRead) readGlobalIds = JSON.parse(rawRead);
      } catch (e) {
        console.warn("Failed to parse readGlobalIds", e);
      }

      // Process global items
      const processedGlobal = currentGlobal.map(item => ({
        ...item,
        read: readGlobalIds.includes(item.id) || item.read
      }));

      // Combine direct, processed global, and stored local items
      const combinedMap = new Map<string, NotificationItem>();
      
      // Default seeds / locals first
      storedLocalItems.forEach(item => combinedMap.set(item.id, item));
      // Then global DB notifications
      processedGlobal.forEach(item => combinedMap.set(item.id, item));
      // Then direct user DB notifications (most specific)
      currentDirect.forEach(item => combinedMap.set(item.id, item));

      const combined = Array.from(combinedMap.values()).sort((a, b) => b.timestamp - a.timestamp);

      // Check for any NEW, UNREAD notifications to show system notification popup across all user devices!
      combined.forEach((notif) => {
        if (!notif.read && !seenNotificationIdsRef.current.has(notif.id)) {
          // If it's a new unread notification that we haven't seen since the app opened/loaded
          // and its timestamp is recent (e.g. not older than 1 hour, to prevent offline queue popups)
          if (Date.now() - notif.timestamp < 3600 * 1000) {
            triggerSystemNotification(`[${notif.category}] ${notif.title}`, notif.body);
          }
        }
        // Add to seen notifications set
        seenNotificationIdsRef.current.add(notif.id);
      });

      setNotifications(combined);
      localStorage.setItem(storageKey, JSON.stringify(combined));
    };

    if (currentUser) {
      // 1. Listen to personal notifications: /users/{userId}/notifications
      try {
        const personalNotifRef = collection(db, 'users', currentUser.uid, 'notifications');
        const personalQuery = query(personalNotifRef, orderBy('timestamp', 'desc'), limit(50));
        unsubDirect = onSnapshot(personalQuery, (snapshot) => {
          const items: NotificationItem[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
              id: doc.id,
              userId: currentUser.uid,
              title: data.title || '',
              body: data.body || '',
              category: (data.category || 'Important Alerts') as NotificationCategory,
              timestamp: data.timestamp || Date.now(),
              read: data.read || false,
            });
          });
          currentDirect = items;
          mergeAndStore();
        }, (err) => {
          console.warn('Personal notifications listening error:', err);
        });
      } catch (e) {
        console.warn('Failed to listen to personal notifications:', e);
      }

      // 2. Listen to global notifications: /global_notifications
      try {
        const globalNotifRef = collection(db, 'global_notifications');
        const globalQuery = query(globalNotifRef, orderBy('timestamp', 'desc'), limit(50));
        unsubGlobal = onSnapshot(globalQuery, (snapshot) => {
          const items: NotificationItem[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
              id: doc.id,
              userId: 'all',
              title: data.title || '',
              body: data.body || '',
              category: (data.category || 'New Features') as NotificationCategory,
              timestamp: data.timestamp || Date.now(),
              read: data.read || false,
            });
          });
          currentGlobal = items;
          mergeAndStore();
        }, (err) => {
          console.warn('Global notifications listening error:', err);
        });
      } catch (e) {
        console.warn('Failed to listen to global notifications:', e);
      }
    }

    // Register simple Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((reg) => {
          console.log('Notification Service Worker registered with scope: ', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    }

    return () => {
      active = false;
      if (unsubDirect) unsubDirect();
      if (unsubGlobal) unsubGlobal();
    };
  }, [currentUser]);

  // Request native permission
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        // Trigger a nice success system notification
        triggerSystemNotification(
          'Notifications Enabled! 🔔',
          'You will now receive exam updates, daily streak reminders, and student alerts.'
        );
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error requesting notification permission', e);
      return false;
    }
  };

  // Trigger system notification
  const triggerSystemNotification = (title: string, body: string, url = '/') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const options = {
        body,
        icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
        badge: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
        data: { url }
      };

      // Try using service worker if active for best OS support (Android/iOS/PWA)
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options);
        }).catch(() => {
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    }
  };

  const markAsRead = async (id: string) => {
    // 1. Update local state
    const updated = notifications.map((n) => {
      if (n.id === id) return { ...n, read: true };
      return n;
    });
    setNotifications(updated);

    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // 2. Clear from unread badge tracker in local storage for global notifications
    const localReadIdsKey = currentUser ? `read_global_ids_${currentUser.uid}` : 'read_global_ids_guest';
    try {
      let readGlobalIds: string[] = [];
      const rawRead = localStorage.getItem(localReadIdsKey);
      if (rawRead) readGlobalIds = JSON.parse(rawRead);
      if (!readGlobalIds.includes(id)) {
        readGlobalIds.push(id);
        localStorage.setItem(localReadIdsKey, JSON.stringify(readGlobalIds));
      }
    } catch (e) {
      console.warn('Error saving read global ID locally', e);
    }

    // 3. Try to update in Firestore if it's a cloud notification
    try {
      const notif = notifications.find(n => n.id === id);
      if (notif && !notif.id.startsWith('seed-') && !notif.id.startsWith('local-')) {
        if (notif.userId === 'all') {
          // Global is read track local
        } else if (currentUser) {
          const docRef = doc(db, 'users', currentUser.uid, 'notifications', id);
          await updateDoc(docRef, { read: true });
        }
      }
    } catch (err) {
      console.warn('Firestore update read failed:', err);
    }
  };

  const markAllAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);

    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // Add all notification IDs to read list
    const localReadIdsKey = currentUser ? `read_global_ids_${currentUser.uid}` : 'read_global_ids_guest';
    try {
      const ids = notifications.map(n => n.id);
      localStorage.setItem(localReadIdsKey, JSON.stringify(ids));
    } catch (e) {
      console.warn("Storage write failed in markAllAsRead", e);
    }

    // Update non-broadcast user notifications on Firestore
    try {
      if (currentUser) {
        const updates = notifications.filter(n => !n.id.startsWith('seed-') && !n.id.startsWith('local-') && n.userId !== 'all' && !n.read);
        for (const notif of updates) {
          const docRef = doc(db, 'users', currentUser.uid, 'notifications', notif.id);
          await updateDoc(docRef, { read: true });
        }
      }
    } catch (e) {
      console.warn("Firestore update failed in markAllAsRead", e);
    }
  };

  const clearNotifications = async () => {
    setNotifications([]);
    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    localStorage.setItem(storageKey, JSON.stringify([]));

    // Also add to global read list so they never show up as unread again if refetched
    const localReadIdsKey = currentUser ? `read_global_ids_${currentUser.uid}` : 'read_global_ids_guest';
    try {
      const ids = notifications.map(n => n.id);
      localStorage.setItem(localReadIdsKey, JSON.stringify(ids));
    } catch (e) {
      console.warn("Storage write failed in clearNotifications", e);
    }
  };

  const sendNotification = async (
    title: string,
    body: string,
    category: NotificationCategory,
    targetUser: string // 'all' or specific user ID
  ): Promise<boolean> => {
    const timestamp = Date.now();
    const payload = {
      userId: targetUser,
      title,
      body,
      category,
      timestamp,
      read: false
    };

    // 1. Emit instant system notification to the current admin/user if they qualify
    const shouldSystemShow = targetUser === 'all' || (currentUser && targetUser === currentUser.uid);
    if (shouldSystemShow) {
      triggerSystemNotification(`[${category}] ${title}`, body);
    }

    // 2. Try adding to Firestore
    try {
      if (targetUser === 'all') {
        const globalRef = collection(db, 'global_notifications');
        await addDoc(globalRef, payload);
      } else {
        const notifRef = collection(db, 'users', targetUser, 'notifications');
        await addDoc(notifRef, payload);
      }
      return true;
    } catch (err) {
      console.warn('Could not add to Firestore directly. Adding locally instead.', err);
      
      // Fallback: append locally as a simulated cloud-broadcast notification
      const localNotification: NotificationItem = {
        id: `local-custom-${timestamp}`,
        ...payload
      };

      const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
      const updated = [localNotification, ...notifications];
      setNotifications(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return true;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        permissionStatus,
        requestPermission,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        sendNotification,
        isAdminUser,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
