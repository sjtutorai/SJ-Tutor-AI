import React, { createContext, useContext, useState, useEffect } from 'react';
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
    } catch (e) {
      initialLocal = SEED_NOTIFICATIONS;
    }

    setNotifications(initialLocal);

    // 2. Try Firestore Subscription for real-time notifications
    let firestoreUnsubscribe: () => void = () => {};
    
    const setupFirestoreSync = async () => {
      try {
        const notifRef = collection(db, 'notifications');
        const q = query(
          notifRef,
          orderBy('timestamp', 'desc'),
          limit(50)
        );

        firestoreUnsubscribe = onSnapshot(q, (snapshot) => {
          const cloudItems: any[] = [];
          snapshot.forEach((doc) => {
            cloudItems.push({ id: doc.id, ...doc.data() });
          });

          // Read global read lists from local storage
          let readGlobalIds: string[] = [];
          try {
            const rawRead = localStorage.getItem(localReadIdsKey);
            if (rawRead) readGlobalIds = JSON.parse(rawRead);
          } catch (e) {
            console.warn("Failed to parse readGlobalIds", e);
          }

          // Read items stored locally
          let userLocalNotifs: NotificationItem[] = [];
          try {
            const localRaw = localStorage.getItem(storageKey);
            if (localRaw) {
              const parsed = JSON.parse(localRaw);
              // keep only purely local ones (items that aren't fetched from firebase)
              userLocalNotifs = parsed.filter((n: any) => !n.id.startsWith('cloud-') && n.id !== doc.id);
            }
          } catch (e) {
            console.warn("Failed to parse userLocalNotifs", e);
          }

          // Format cloud items
          const formattedCloud = cloudItems.map((item) => {
            const isReadLocally = readGlobalIds.includes(item.id);
            const isForCurrentUser = item.userId === 'all' || (currentUser && item.userId === currentUser.uid);
            
            if (!isForCurrentUser) return null;

            return {
              id: item.id,
              userId: item.userId,
              title: item.title,
              body: item.body,
              category: item.category as NotificationCategory,
              timestamp: item.timestamp,
              read: isReadLocally || item.read || false,
            };
          }).filter(Boolean) as NotificationItem[];

          // Combine with local mock/seeded ones that are not duplicates
          const cloudIds = new Set(formattedCloud.map(n => n.id));
          const filteredLocal = userLocalNotifs.filter(n => !cloudIds.has(n.id) && !n.id.startsWith('seed-'));
          
          // Also check seeds if there are no cloud notifications
          const finalSeeds = cloudItems.length === 0 ? SEED_NOTIFICATIONS.filter(n => !cloudIds.has(n.id)) : [];

          const combined = [...formattedCloud, ...filteredLocal, ...finalSeeds].sort((a, b) => b.timestamp - a.timestamp);
          
          setNotifications(combined);
          localStorage.setItem(storageKey, JSON.stringify(combined));
        }, (err) => {
          console.warn('Firestore notifications sync not supported/permitted:', err.message);
          // Fall back gracefully to LocalStorage
        });
      } catch (err) {
        console.warn('Could not launch Firestore listeners for notifications:', err);
      }
    };

    setupFirestoreSync();

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
      firestoreUnsubscribe();
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

    // 3. Try to update in Firestore if it's a cloud notification and not broadcast
    try {
      const notif = notifications.find(n => n.id === id);
      if (notif && !notif.id.startsWith('seed-') && notif.userId !== 'all') {
        const docRef = doc(db, 'notifications', id);
        await updateDoc(docRef, { read: true });
      }
    } catch (err) {
      // Graceful fail
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
      const updates = notifications.filter(n => !n.id.startsWith('seed-') && n.userId !== 'all' && !n.read);
      for (const notif of updates) {
        const docRef = doc(db, 'notifications', notif.id);
        await updateDoc(docRef, { read: true });
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
      const notifRef = collection(db, 'notifications');
      await addDoc(notifRef, payload);
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
