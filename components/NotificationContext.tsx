import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  collection, query, addDoc, doc, updateDoc, limit, orderBy, onSnapshot, 
  arrayUnion, setDoc, writeBatch, getDocs, deleteDoc 
} from 'firebase/firestore';
import { auth, db, getFCM } from '../firebaseConfig';
import { User, onAuthStateChanged } from 'firebase/auth';
import { getToken, onMessage } from 'firebase/messaging';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Flame, Trophy, Award, Bell, X } from 'lucide-react';
import { NotificationService } from '../services/notificationService';

export type NotificationCategory = 'New Features' | 'Daily Streak Reminders' | 'Quiz Updates' | 'Competition Announcements' | 'Important Alerts';

export interface NotificationItem {
  id: string;
  userId: string; // 'all' or actual user UID
  title: string;
  body: string;
  category: NotificationCategory;
  timestamp: number;
  read: boolean;
  link?: string;
  metadata?: any;
}

export interface ActiveToast {
  id: string;
  title: string;
  body: string;
  category: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  if (process.env.NODE_ENV === 'development') {
    console.error('Firestore Error details: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

interface NotificationContextProps {
  notifications: NotificationItem[];
  unreadCount: number;
  permissionStatus: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  sendNotification: (title: string, body: string, category: NotificationCategory, targetUser: string, link?: string, metadata?: any) => Promise<boolean>;
  sendBulkNotification: (title: string, body: string, category: NotificationCategory, targetType: 'all' | 'selected' | 'class', targetValue: string[], scheduledTime?: number) => Promise<boolean>;
  triggerToast: (title: string, body: string, category?: string) => void;
  isAdminUser: boolean;
  setupFCM: (user: User) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'seed-1',
    userId: 'all',
    title: 'Welcome to your brand-new Notification Center! 🔔',
    body: 'Say hello to the all-new SJ Tutor AI Notification Center. Track your quiz challenges, daily reminders, alerts, and feature updates right here.',
    category: 'New Features',
    timestamp: Date.now() - 3600000 * 2,
    read: false,
  },
  {
    id: 'seed-2',
    userId: 'all',
    title: 'Daily Streak Challenge Active 🔥',
    body: 'Complete your daily learning goal of 30 minutes. Keep your streak alive to unlock free premium credits!',
    category: 'Daily Streak Reminders',
    timestamp: Date.now() - 3600000 * 5,
    read: false,
  },
  {
    id: 'seed-3',
    userId: 'all',
    title: 'Double-Credit MCQ Science Challenge 🧪',
    body: 'A mock science test series is now available on your Quiz Creator tab. Pass with 90% or above to claim 50 free credits.',
    category: 'Quiz Updates',
    timestamp: Date.now() - 86400000,
    read: false,
  },
  {
    id: 'seed-4',
    userId: 'all',
    title: 'National SJ AI Olympiad 2026! 🚀',
    body: 'Early bird registration is open for the SJ AI Olympiad. Test your skills against students nationwide and win exciting cash scholarships!',
    category: 'Competition Announcements',
    timestamp: Date.now() - 86400000 * 2,
    read: true,
  }
];

export const sanitizeNotification = (raw: any, defaultId?: string): NotificationItem => {
  if (!raw || typeof raw !== 'object') {
    return {
      id: defaultId || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: 'all',
      title: 'Alert',
      body: '',
      category: 'Important Alerts',
      timestamp: Date.now(),
      read: false,
    };
  }

  let title = '';
  let body = '';
  let category: NotificationCategory = 'Important Alerts';

  if (typeof raw.title === 'string') {
    title = raw.title;
  } else if (raw.title && typeof raw.title === 'object') {
    title = typeof raw.title.title === 'string' ? raw.title.title : (typeof raw.title.body === 'string' ? raw.title.body : '');
    if (!body && typeof raw.title.body === 'string') body = raw.title.body;
    if (typeof raw.title.category === 'string') category = raw.title.category as NotificationCategory;
  }

  if (typeof raw.body === 'string') {
    body = raw.body;
  } else if (raw.body && typeof raw.body === 'object') {
    body = typeof raw.body.body === 'string' ? raw.body.body : (typeof raw.body.title === 'string' ? raw.body.title : '');
  }

  if (!title) {
    title = body ? (body.length > 35 ? body.slice(0, 35) + '...' : body) : 'Notification';
  }

  const validCategories: NotificationCategory[] = [
    'New Features',
    'Daily Streak Reminders',
    'Quiz Updates',
    'Competition Announcements',
    'Important Alerts'
  ];
  const rawCat = raw.category || category;
  const finalCategory = validCategories.includes(rawCat) ? rawCat : 'Important Alerts';

  let timestamp = Date.now();
  if (typeof raw.timestamp === 'number') {
    timestamp = raw.timestamp;
  } else if (raw.createdAt?.seconds) {
    timestamp = raw.createdAt.seconds * 1000;
  } else if (raw.timestamp?.seconds) {
    timestamp = raw.timestamp.seconds * 1000;
  }

  return {
    id: String(raw.id || defaultId || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    userId: String(raw.userId || raw.targetUserId || 'all'),
    title: String(title),
    body: String(body),
    category: finalCategory,
    timestamp,
    read: Boolean(raw.read),
    link: typeof raw.link === 'string' ? raw.link : undefined,
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : undefined,
  };
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window && window.Notification
        ? window.Notification.permission
        : 'denied';
    } catch {
      return 'denied';
    }
  });

  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([]);

  const triggerToast = (title: string, body: string, category = 'Important Alerts') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ActiveToast = { id, title, body, category };
    setActiveToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setActiveToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const triggerToastRef = useRef<(title: string, body: string, category?: string) => void>(() => {});
  
  useEffect(() => {
    triggerToastRef.current = triggerToast;
  }, []);

  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const isAdminUser = currentUser?.email === 'sjtutorai@gmail.com';

  // FCM Token generation & storage
  const setupFCM = async (user: User) => {
    try {
      const messaging = await getFCM();
      if (!messaging) return;

      if (Notification.permission !== 'granted') {
        return;
      }

      const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY || 'BMrbB4gM7e_E9l_YvZ7W89uaCN4S8k9eSZ-hNyWpq0To';

      let reg: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!reg) {
          reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }
      }

      const token = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: reg
      });

      if (token && user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('FCM token generated successfully:', token);
        }
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          fcmToken: token,
          fcmTokens: arrayUnion(token)
        }).catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Failed to store token on user doc, trying write/create:', err);
          }
        });
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('FCM generation/registration failed:', err);
      }
    }
  };

  // Track auth state & register service worker
  useEffect(() => {
    NotificationService.registerServiceWorker().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Sync / load notifications
  useEffect(() => {
    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    const localReadIdsKey = currentUser ? `read_global_ids_${currentUser.uid}` : 'read_global_ids_guest';
    const localDeletedIdsKey = currentUser ? `deleted_global_ids_${currentUser.uid}` : 'deleted_global_ids_guest';
    
    let initialLocal: NotificationItem[] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          initialLocal = parsed.map((item, idx) => sanitizeNotification(item, `local-${idx}`));
        } else {
          initialLocal = SEED_NOTIFICATIONS.map((item, idx) => sanitizeNotification(item, `seed-${idx}`));
        }
      } else {
        initialLocal = SEED_NOTIFICATIONS.map((item, idx) => sanitizeNotification(item, `seed-${idx}`));
        localStorage.setItem(storageKey, JSON.stringify(initialLocal));
      }
    } catch {
      initialLocal = SEED_NOTIFICATIONS.map((item, idx) => sanitizeNotification(item, `seed-${idx}`));
    }

    setNotifications(initialLocal);

    const loadedIds = new Set(initialLocal.map(n => n.id));
    seenNotificationIdsRef.current = loadedIds;

    let active = true;
    let unsubDirect: (() => void) | null = null;
    let unsubGlobal: (() => void) | null = null;

    let currentDirect: NotificationItem[] = [];
    let currentGlobal: NotificationItem[] = [];

    const mergeAndStore = () => {
      if (!active) return;

      let storedLocalItems: NotificationItem[] = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            storedLocalItems = parsed
              .filter((n: any) => n && (String(n.id).startsWith('local-') || String(n.id).startsWith('seed-')))
              .map((n: any, idx: number) => sanitizeNotification(n, `local-${idx}`));
          }
        }
      } catch {
        storedLocalItems = SEED_NOTIFICATIONS.map((item, idx) => sanitizeNotification(item, `seed-${idx}`));
      }

      let readGlobalIds: string[] = [];
      try {
        const rawRead = localStorage.getItem(localReadIdsKey);
        if (rawRead) readGlobalIds = JSON.parse(rawRead);
      } catch (e) {
        console.warn("Failed to parse readGlobalIds", e);
      }

      let deletedGlobalIds: string[] = [];
      try {
        const rawDeleted = localStorage.getItem(localDeletedIdsKey);
        if (rawDeleted) deletedGlobalIds = JSON.parse(rawDeleted);
      } catch (e) {
        console.warn("Failed to parse deletedGlobalIds", e);
      }

      const processedGlobal = currentGlobal
        .filter(item => !deletedGlobalIds.includes(item.id))
        .map(item => ({
          ...item,
          read: readGlobalIds.includes(item.id) || item.read
        }));

      const combinedMap = new Map<string, NotificationItem>();
      
      storedLocalItems.forEach(item => combinedMap.set(item.id, item));
      processedGlobal.forEach(item => combinedMap.set(item.id, item));
      currentDirect.forEach(item => combinedMap.set(item.id, item));

      const combined = Array.from(combinedMap.values()).sort((a, b) => b.timestamp - a.timestamp);

      combined.forEach((notif) => {
        if (!notif.read && !seenNotificationIdsRef.current.has(notif.id)) {
          if (Date.now() - notif.timestamp < 3600 * 1000) {
            triggerSystemNotification(`[${notif.category}] ${notif.title}`, notif.body);
            triggerToastRef.current(notif.title, notif.body, notif.category);
          }
        }
        seenNotificationIdsRef.current.add(notif.id);
      });

      setNotifications(combined);
      localStorage.setItem(storageKey, JSON.stringify(combined));
    };

    if (currentUser) {
      // 1. Listen to personal notifications
      try {
        const personalNotifRef = collection(db, 'users', currentUser.uid, 'notifications');
        const personalQuery = query(personalNotifRef, orderBy('timestamp', 'desc'), limit(50));
        unsubDirect = onSnapshot(personalQuery, (snapshot) => {
          const items: NotificationItem[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            items.push(sanitizeNotification({
              id: doc.id,
              userId: currentUser.uid,
              ...data,
            }, doc.id));
          });
          currentDirect = items;
          mergeAndStore();
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, `users/${currentUser.uid}/notifications`);
        });
      } catch (e) {
        console.warn('Failed to listen to personal notifications:', e);
      }

      // 2. Listen to global notifications
      try {
        const globalNotifRef = collection(db, 'global_notifications');
        const globalQuery = query(globalNotifRef, orderBy('timestamp', 'desc'), limit(50));
        unsubGlobal = onSnapshot(globalQuery, (snapshot) => {
          const items: NotificationItem[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            items.push(sanitizeNotification({
              id: doc.id,
              userId: 'all',
              ...data,
            }, doc.id));
          });
          currentGlobal = items;
          mergeAndStore();
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'global_notifications');
        });
      } catch (e) {
        console.warn('Failed to listen to global notifications:', e);
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((reg) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('FCM Service Worker registered successfully: ', reg.scope);
          }
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

  // Handle Foreground/onMessage and Token Generation
  useEffect(() => {
    let unsubscribeOnMessage: (() => void) | null = null;

    const initFCMListener = async () => {
      try {
        const messaging = await getFCM();
        if (messaging && currentUser) {
          // Listen to token refresh
          setupFCM(currentUser);

          // Configure Foreground messaging onMessage()
          unsubscribeOnMessage = onMessage(messaging, (payload) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('Foreground FCM received:', payload);
            }

            const rawTitle = payload.notification?.title || payload.data?.title || 'SJ Tutor AI';
            const rawBody = payload.notification?.body || payload.data?.body || '';
            const rawCat = (payload.data?.category || 'Important Alerts') as NotificationCategory;

            const newNotif = sanitizeNotification({
              id: payload.data?.notificationId || `fcm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              userId: currentUser.uid,
              title: rawTitle,
              body: rawBody,
              category: rawCat,
              timestamp: Date.now(),
              read: false,
            });

            triggerSystemNotification(newNotif.title, newNotif.body);
            triggerToast(newNotif.title, newNotif.body, newNotif.category);

            setNotifications((prev) => {
              if (prev.some(n => n.id === newNotif.id)) return prev;
              const updated = [newNotif, ...prev];
              const storageKey = `notifications_${currentUser.uid}`;
              localStorage.setItem(storageKey, JSON.stringify(updated));
              return updated;
            });
          });
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('FCM listener setup failed:', err);
        }
      }
    };

    if (currentUser) {
      initFCMListener();
    }

    return () => {
      if (unsubscribeOnMessage) unsubscribeOnMessage();
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
        NotificationService.registerServiceWorker().catch(() => {});
        triggerSystemNotification(
          'Notifications & Calls Enabled! 🔔',
          'You will now receive incoming call alerts with Accept/Decline actions even when away from the app.'
        );
        if (currentUser) {
          setupFCM(currentUser);
        }
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
        icon: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
        badge: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
        data: { url }
      };

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
    const updated = notifications.map((n) => {
      if (n.id === id) return { ...n, read: true };
      return n;
    });
    setNotifications(updated);

    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    localStorage.setItem(storageKey, JSON.stringify(updated));

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

    try {
      const notif = notifications.find(n => n.id === id);
      if (notif && !notif.id.startsWith('seed-') && !notif.id.startsWith('local-')) {
        if (notif.userId !== 'all' && currentUser) {
          const docRef = doc(db, 'users', currentUser.uid, 'notifications', id);
          await updateDoc(docRef, { read: true });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser?.uid}/notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);

    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    localStorage.setItem(storageKey, JSON.stringify(updated));

    const localReadIdsKey = currentUser ? `read_global_ids_${currentUser.uid}` : 'read_global_ids_guest';
    try {
      const ids = notifications.map(n => n.id);
      localStorage.setItem(localReadIdsKey, JSON.stringify(ids));
    } catch (e) {
      console.warn("Storage write failed in markAllAsRead", e);
    }

    try {
      if (currentUser) {
        const updates = notifications.filter(n => !n.id.startsWith('seed-') && !n.id.startsWith('local-') && n.userId !== 'all' && !n.read);
        for (const notif of updates) {
          const docRef = doc(db, 'users', currentUser.uid, 'notifications', notif.id);
          await updateDoc(docRef, { read: true });
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser?.uid}/notifications`);
    }
  };

  const deleteNotification = async (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);

    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    localStorage.setItem(storageKey, JSON.stringify(updated));

    const matched = notifications.find(n => n.id === id);
    if (matched?.userId === 'all') {
      const localDeletedKey = currentUser ? `deleted_global_ids_${currentUser.uid}` : 'deleted_global_ids_guest';
      try {
        let deletedGlobalIds: string[] = [];
        const rawDeleted = localStorage.getItem(localDeletedKey);
        if (rawDeleted) deletedGlobalIds = JSON.parse(rawDeleted);
        if (!deletedGlobalIds.includes(id)) {
          deletedGlobalIds.push(id);
          localStorage.setItem(localDeletedKey, JSON.stringify(deletedGlobalIds));
        }
      } catch (e) {
        console.warn('Error saving deleted global ID locally', e);
      }
    } else {
      try {
        if (currentUser && !id.startsWith('seed-') && !id.startsWith('local-')) {
          const docRef = doc(db, 'users', currentUser.uid, 'notifications', id);
          await deleteDoc(docRef);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser?.uid}/notifications/${id}`);
      }
    }
  };

  const clearNotifications = async () => {
    setNotifications([]);
    const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
    localStorage.setItem(storageKey, JSON.stringify([]));

    const localReadIdsKey = currentUser ? `read_global_ids_${currentUser.uid}` : 'read_global_ids_guest';
    try {
      const ids = notifications.map(n => n.id);
      localStorage.setItem(localReadIdsKey, JSON.stringify(ids));
    } catch (e) {
      console.warn("Storage write failed in clearNotifications", e);
    }
  };

  const sendNotification = async (
    titleOrObj: string | any,
    body?: string,
    category?: NotificationCategory,
    targetUser?: string,
    link?: string,
    metadata?: any
  ): Promise<boolean> => {
    let finalTitle = '';
    let finalBody = '';
    let finalCategory: NotificationCategory = 'Important Alerts';
    let finalTargetUser = 'all';
    let finalLink = link;
    let finalMetadata = metadata;

    if (titleOrObj && typeof titleOrObj === 'object') {
      finalTitle = typeof titleOrObj.title === 'string' ? titleOrObj.title : (titleOrObj.title?.title || titleOrObj.body || 'Alert');
      finalBody = typeof titleOrObj.body === 'string' ? titleOrObj.body : '';
      finalCategory = (titleOrObj.category || category || 'Important Alerts') as NotificationCategory;
      finalTargetUser = titleOrObj.targetUser || titleOrObj.targetUserId || titleOrObj.userId || targetUser || 'all';
      finalLink = titleOrObj.link || link;
      finalMetadata = titleOrObj.metadata || metadata;
    } else {
      finalTitle = typeof titleOrObj === 'string' ? titleOrObj : String(titleOrObj || 'Alert');
      finalBody = typeof body === 'string' ? body : String(body || '');
      finalCategory = (category || 'Important Alerts') as NotificationCategory;
      finalTargetUser = targetUser || 'all';
    }

    const timestamp = Date.now();
    const payload: Omit<NotificationItem, 'id'> = {
      userId: finalTargetUser,
      title: finalTitle,
      body: finalBody,
      category: finalCategory,
      timestamp,
      read: false,
      ...(finalLink && { link: finalLink }),
      ...(finalMetadata && { metadata: finalMetadata })
    };

    const shouldSystemShow = finalTargetUser === 'all' || (currentUser && finalTargetUser === currentUser.uid);
    if (shouldSystemShow) {
      triggerSystemNotification(`[${finalCategory}] ${finalTitle}`, finalBody);
    }

    try {
      if (finalTargetUser === 'all') {
        const globalRef = collection(db, 'global_notifications');
        await addDoc(globalRef, payload);
      } else {
        const notifRef = collection(db, 'users', finalTargetUser, 'notifications');
        await addDoc(notifRef, payload);
      }
      return true;
    } catch (err) {
      console.warn('Could not add to Firestore directly. Adding locally instead.', err);
      
      const localNotification: NotificationItem = sanitizeNotification({
        id: `local-custom-${timestamp}`,
        ...payload
      });

      const storageKey = currentUser ? `notifications_${currentUser.uid}` : 'notifications_guest';
      const updated = [localNotification, ...notifications];
      setNotifications(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return true;
    }
  };

  // Secure Admin Bulk Sender (Immediate / Scheduled) with Delivery logs
  const sendBulkNotification = async (
    title: string,
    body: string,
    category: NotificationCategory,
    targetType: 'all' | 'selected' | 'class',
    targetValue: string[],
    scheduledTime?: number
  ): Promise<boolean> => {
    if (!currentUser || !isAdminUser) {
      alert('Access Denied: Only registered Admins can send bulk alerts.');
      return false;
    }

    const timestamp = Date.now();
    const logId = `log-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;

    // If scheduled for the future
    if (scheduledTime && scheduledTime > timestamp) {
      try {
        const schedRef = doc(db, 'notifications', logId);
        await setDoc(schedRef, {
          title,
          body,
          category,
          timestamp,
          scheduledTime,
          status: 'pending',
          targetType,
          targetValue,
        });
        
        const logRef = doc(db, 'notification_logs', logId);
        await setDoc(logRef, {
          title,
          body,
          category,
          timestamp,
          senderId: currentUser.uid,
          targetType,
          targetValue,
          recipientCount: 0,
          successCount: 0,
          failureCount: 0,
          status: 'scheduled',
          errors: [],
          retryCount: 0
        });
        return true;
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `notifications/${logId}`);
        return false;
      }
    }

    // Immediate dispatch
    try {
      let targetUserIds: string[] = [];
      
      if (targetType === 'all') {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(d => {
          if (d.id) targetUserIds.push(d.id);
        });
      } else if (targetType === 'selected') {
        targetUserIds = targetValue;
      } else if (targetType === 'class') {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(d => {
          const uData = d.data();
          const userClass = uData.grade || uData.gradeClass || '';
          if (targetValue.includes(userClass)) {
            targetUserIds.push(d.id);
          }
        });
      }

      if (targetUserIds.length === 0) {
        const logRef = doc(db, 'notification_logs', logId);
        await setDoc(logRef, {
          title,
          body,
          category,
          timestamp,
          senderId: currentUser.uid,
          targetType,
          targetValue,
          recipientCount: 0,
          successCount: 0,
          failureCount: 0,
          status: 'failed',
          errors: ['No matching recipients found.'],
          retryCount: 0
        });
        return false;
      }

      let successCount = 0;
      const failureCount = 0;
      const errors: string[] = [];

      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      for (const uid of targetUserIds) {
        const userNotifRef = doc(collection(db, 'users', uid, 'notifications'));
        currentBatch.set(userNotifRef, {
          userId: uid,
          title,
          body,
          category,
          timestamp,
          read: false
        });
        
        successCount++;
        count++;

        if (count >= 400) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          count = 0;
        }
      }
      
      if (count > 0) {
        batches.push(currentBatch);
      }

      for (const b of batches) {
        await b.commit();
      }

      const logRef = doc(db, 'notification_logs', logId);
      await setDoc(logRef, {
        title,
        body,
        category,
        timestamp,
        senderId: currentUser.uid,
        targetType,
        targetValue,
        recipientCount: targetUserIds.length,
        successCount,
        failureCount,
        status: failureCount === 0 ? 'success' : (successCount > 0 ? 'partially_failed' : 'failed'),
        errors,
        retryCount: 0
      });

      if (targetType === 'all') {
        const globalRef = collection(db, 'global_notifications');
        await addDoc(globalRef, {
          userId: 'all',
          title,
          body,
          category,
          timestamp,
          read: false
        });
      }

      return true;
    } catch (err: any) {
      try {
        const logRef = doc(db, 'notification_logs', logId);
        await setDoc(logRef, {
          title,
          body,
          category,
          timestamp,
          senderId: currentUser?.uid || 'unknown',
          targetType,
          targetValue,
          recipientCount: 0,
          successCount: 0,
          failureCount: 1,
          status: 'failed',
          errors: [err.message || String(err)],
          retryCount: 0
        });
      } catch (logErr) {
        console.error('Could not write failure log:', logErr);
      }
      handleFirestoreError(err, OperationType.WRITE, `notification_logs/${logId}`);
      return false;
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
        deleteNotification,
        sendNotification,
        sendBulkNotification,
        triggerToast,
        isAdminUser,
        setupFCM,
      }}
    >
      {children}

      {/* FIXED TOAST NOTIFICATION OVERLAY (TOP-RIGHT) */}
      <div className="fixed top-5 right-5 z-[99999] w-full max-w-sm flex flex-col gap-3 pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {activeToasts.map((toast) => {
            let Icon = Bell;
            let iconColor = "text-primary-500 bg-primary-50 dark:bg-primary-950/40";
            let borderGlow = "border-primary-100 dark:border-primary-900/40";
            
            if (toast.category?.includes("Streak")) {
              Icon = Flame;
              iconColor = "text-orange-500 bg-orange-50 dark:bg-orange-950/40";
              borderGlow = "border-orange-100 dark:border-orange-900/40";
            } else if (toast.category?.includes("Quiz")) {
              Icon = Trophy;
              iconColor = "text-blue-500 bg-blue-50 dark:bg-blue-950/40";
              borderGlow = "border-blue-100 dark:border-blue-900/40";
            } else if (toast.category?.includes("Competition") || toast.category?.includes("Olympiad")) {
              Icon = Award;
              iconColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/40";
              borderGlow = "border-amber-100 dark:border-amber-900/40";
            } else if (toast.category?.includes("Features")) {
              Icon = Sparkles;
              iconColor = "text-purple-500 bg-purple-50 dark:bg-purple-950/40";
              borderGlow = "border-purple-100 dark:border-purple-900/40";
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 120, scale: 0.9, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 100, scale: 0.9, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className={`pointer-events-auto w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border ${borderGlow} p-4 shadow-xl flex gap-3.5 items-start relative overflow-hidden text-left`}
              >
                {/* Visual Accent Sparkle */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary-500 to-indigo-500" />

                <div className={`p-2 rounded-xl flex-shrink-0 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                    {toast.category || "Alert"}
                  </h4>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {toast.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {toast.body}
                  </p>
                </div>

                <button
                  onClick={() => setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="p-1 text-slate-300 hover:text-slate-500 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
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
