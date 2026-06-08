import { 
  collection, 
  doc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  setDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: 'New Features' | 'Daily Streak Reminders' | 'Quiz Updates' | 'Competition Announcements' | 'Important Alerts';
  read: boolean;
  createdAt: number;
  userId: string; // User ID or 'all' for global
}

const NOTIFICATION_STORAGE_KEY = 'sj_tutor_notifications';
const READ_GLOBAL_KEY = 'sj_tutor_read_globals';

// Elegant default seeded notifications
const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'seed-1',
    title: 'Welcome to your Notification Center! 🔔',
    body: 'You can now track all dynamic alerts, daily learning goals, personal streaks, and competition announcements in real-time.',
    category: 'New Features',
    read: false,
    createdAt: Date.now() - 3600000, // 1 hour ago
    userId: 'all'
  },
  {
    id: 'seed-2',
    title: 'Keep your daily learning streak alive! 🔥',
    body: 'You are currently on a 4-day streak! Check out your custom summaries and secure today\'s goal to maintain your streak.',
    category: 'Daily Streak Reminders',
    read: false,
    createdAt: Date.now() - 10800000, // 3 hours ago
    userId: 'all'
  },
  {
    id: 'seed-3',
    title: 'New Algebra Practice Quiz Available 📝',
    body: 'An adaptive mathematics quiz on algebraic functions has been prepared for you based on your learning style.',
    category: 'Quiz Updates',
    read: false,
    createdAt: Date.now() - 86400000, // 1 day ago
    userId: 'all'
  },
  {
    id: 'seed-4',
    title: 'Weekly Grand Quiz Competition is Live! 🏆',
    body: 'Join the SJ Tutor AI League today. The top 3 rankers on the scoreboard will win 500 extra AI summary credits.',
    category: 'Competition Announcements',
    read: true,
    createdAt: Date.now() - 172800000, // 2 days ago
    userId: 'all'
  },
  {
    id: 'seed-5',
    title: 'Free Monthly Learning Credits Active! ⚡',
    body: 'We have renewed your wallet with 100 high-speed AI tokens. Use them to scan & solve, converse with your tutor,, or write essays.',
    category: 'Important Alerts',
    read: true,
    createdAt: Date.now() - 259200000, // 3 days ago
    userId: 'all'
  }
];

export class NotificationService {
  /**
   * Request browser push notification permissions and register service worker.
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support system notifications.');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await this.registerServiceWorker();
    }
    return permission;
  }

  /**
   * Register the background push service worker.
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      // Register sw.js
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[NotificationService] Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('[NotificationService] Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Trigger a raw system notification inside the browser/device (Foreground or Background helper)
   */
  static async showLocalNotification(title: string, body: string, category?: string) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.showNotification(title, {
            body,
            icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
            badge: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
            vibrate: [200, 100, 200],
            data: { category }
          });
        } else {
          new Notification(title, {
            body,
            icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg'
          });
        }
      } catch (e) {
        new Notification(title, {
          body,
          icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg'
        });
      }
    }
  }

  /**
   * Retrieve all notifications for the current subscriber.
   * Merges firebase / local storage / seeded defaults beautifully.
   */
  static getLocalNotifications(): AppNotification[] {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_NOTIFICATIONS;
    }
  }

  /**
   * Save notifications list to localStorage for local caching.
   */
  static saveLocalNotifications(notifications: AppNotification[]) {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  }

  /**
   * Subscribes to real-time notification feeds.
   * Calls the onChange callback whenever any new notifications are synchronized.
   */
  static subscribeToNotifications(
    userId: string | null, 
    onChange: (notifications: AppNotification[]) => void
  ): () => void {
    // 1. Load initial local states and trigger callback
    const mergedList = this.getLocalNotifications();
    onChange([...mergedList].sort((a, b) => b.createdAt - a.createdAt));

    // Handle background service worker communication
    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        const newNotif: AppNotification = event.data.notification;
        const currentList = this.getLocalNotifications();
        
        // Prevent duplicate IDs
        if (!currentList.some(n => n.id === newNotif.id)) {
          const updated = [newNotif, ...currentList];
          this.saveLocalNotifications(updated);
          onChange(updated.sort((a, b) => b.createdAt - a.createdAt));
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', messageHandler);

    // If no user is logged in, use standard localStorage state only
    if (!userId) {
      return () => {
        navigator.serviceWorker?.removeEventListener('message', messageHandler);
      };
    }

    // 2. Setup Firebase Realtime Subscriptions
    try {
      // Subscribe to Direct Personal Notifications
      const directQuery = query(
        collection(db, `users/${userId}/notifications`),
        orderBy('createdAt', 'desc')
      );

      const unsubDirect = onSnapshot(directQuery, (snapshot) => {
        const directNotifs: AppNotification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          directNotifs.push({
            id: doc.id,
            title: data.title || '',
            body: data.body || '',
            category: data.category || 'Important Alerts',
            read: data.read ?? false,
            createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt || Date.now()),
            userId: userId
          });
        });

        // Query Global notifications in real-time as well
        const globalRef = collection(db, 'global_notifications');
        getDocs(globalRef).then((globalSnapshot) => {
          const globalNotifs: AppNotification[] = [];
          
          // Get user read global IDs from localStorage or user state
          const readGlobalsRaw = localStorage.getItem(`${READ_GLOBAL_KEY}_${userId}`);
          const readGlobalIds: string[] = readGlobalsRaw ? JSON.parse(readGlobalsRaw) : [];

          globalSnapshot.forEach((doc) => {
            const data = doc.data();
            globalNotifs.push({
              id: doc.id,
              title: data.title || '',
              body: data.body || '',
              category: data.category || 'New Features',
              read: readGlobalIds.includes(doc.id),
              createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (data.createdAt || Date.now()),
              userId: 'all'
            });
          });

          // Reconcile and merge all elements (Local default seeded + direct + global)
          const allSeeds = DEFAULT_NOTIFICATIONS;
          const map = new Map<string, AppNotification>();
          
          // Seed fallback definitions
          allSeeds.forEach(item => map.set(item.id, item));
          // Global database elements
          globalNotifs.forEach(item => map.set(item.id, item));
          // Direct personal elements
          directNotifs.forEach(item => map.set(item.id, item));

          const finalized = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
          
          // Save a cached copy
          this.saveLocalNotifications(finalized);
          onChange(finalized);
        }).catch(err => {
          console.error("Global notifications fetch fail:", err);
          // Fallback to direct and seeded only
          const allSeeds = DEFAULT_NOTIFICATIONS;
          const map = new Map<string, AppNotification>();
          
          allSeeds.forEach(item => map.set(item.id, item));
          directNotifs.forEach(item => map.set(item.id, item));
          onChange(Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt));
        });
      }, (err) => {
        console.error("Direct notifications sync error:", err);
      });

      return () => {
        unsubDirect();
        navigator.serviceWorker?.removeEventListener('message', messageHandler);
      };
    } catch (e) {
      console.error("Firestore sync subscription boot failed:", e);
      return () => {
        navigator.serviceWorker?.removeEventListener('message', messageHandler);
      };
    }
  }

  /**
   * Mark a notification as read.
   */
  static async markAsRead(userId: string | null, notificationId: string): Promise<void> {
    // 1. Update in local storage
    const list = this.getLocalNotifications();
    const foundIndex = list.findIndex(n => n.id === notificationId);
    if (foundIndex !== -1) {
      list[foundIndex].read = true;
      this.saveLocalNotifications(list);
    }

    if (!userId) {
      return;
    }

    try {
      // 2. Resolve database source
      if (notificationId.startsWith('seed-')) {
        // Seeds are local only
        return;
      }

      // Check if it's a global notification (userId === 'all')
      const isGlobal = list.find(n => n.id === notificationId)?.userId === 'all';

      if (isGlobal) {
        const readGlobalsRaw = localStorage.getItem(`${READ_GLOBAL_KEY}_${userId}`);
        const readGlobalIds: string[] = readGlobalsRaw ? JSON.parse(readGlobalsRaw) : [];
        if (!readGlobalIds.includes(notificationId)) {
          readGlobalIds.push(notificationId);
          localStorage.setItem(`${READ_GLOBAL_KEY}_${userId}`, JSON.stringify(readGlobalIds));
        }
      } else {
        // Direct notification
        const docRef = doc(db, `users/${userId}/notifications`, notificationId);
        await updateDoc(docRef, { read: true });
      }
    } catch (e) {
      console.error("Failed updating read status in Firestore, falls back to local:", e);
    }
  }

  /**
   * Send a system notification (Admin function).
   * Broadcasts to all users (writes to /global_notifications) or sends to a target user.
   */
  static async sendNotification(
    senderId: string,
    title: string,
    body: string,
    category: AppNotification['category'],
    targetUserId: string = 'all' // 'all' or specific uid
  ): Promise<boolean> {
    try {
      const payload = {
        title,
        body,
        category,
        createdAt: serverTimestamp(),
        userId: targetUserId
      };

      if (targetUserId === 'all') {
        const globalRef = collection(db, 'global_notifications');
        const docRef = await addDoc(globalRef, payload);
        
        // Push notification trigger to the local clients
        this.showLocalNotification(title, body, category);
        
        // Seed into local list as well
        const list = this.getLocalNotifications();
        list.unshift({
          id: docRef.id,
          title,
          body,
          category,
          createdAt: Date.now(),
          read: false,
          userId: 'all'
        });
        this.saveLocalNotifications(list);
        
        return true;
      } else {
        const userRef = collection(db, `users/${targetUserId}/notifications`);
        await addDoc(userRef, payload);
        
        // Push notification local simulation
        if (targetUserId === auth.currentUser?.uid) {
          this.showLocalNotification(title, body, category);
        }
        return true;
      }
    } catch (e) {
      console.error("Database notification insert failed:", e);
      
      // Local simulation fallback
      const list = this.getLocalNotifications();
      const mockId = 'local-mock-' + Math.random().toString(36).substr(2, 9);
      list.unshift({
        id: mockId,
        title,
        body,
        category,
        createdAt: Date.now(),
        read: false,
        userId: targetUserId
      });
      this.saveLocalNotifications(list);
      this.showLocalNotification(title, body, category);
      return true;
    }
  }

  /**
   * Delete a notification helper.
   */
  static async deleteNotification(userId: string | null, notificationId: string): Promise<void> {
    const list = this.getLocalNotifications();
    const filtered = list.filter(n => n.id !== notificationId);
    this.saveLocalNotifications(filtered);

    if (!userId || notificationId.startsWith('seed-')) {
      return;
    }

    try {
      const isGlobal = list.find(n => n.id === notificationId)?.userId === 'all';
      if (!isGlobal) {
        const docRef = doc(db, `users/${userId}/notifications`, notificationId);
        await deleteDoc(docRef);
      }
    } catch (e) {
      console.error("Failed to delete from Firestore:", e);
    }
  }

  /**
   * Mark all notifications as read.
   */
  static async markAllAsRead(userId: string | null): Promise<void> {
    const list = this.getLocalNotifications();
    const updated = list.map(n => ({ ...n, read: true }));
    this.saveLocalNotifications(updated);

    if (!userId) return;

    try {
      // Mark local indices
      const globalIds = list.filter(n => n.userId === 'all').map(n => n.id);
      localStorage.setItem(`${READ_GLOBAL_KEY}_${userId}`, JSON.stringify(globalIds));

      // For direct notifications, fetch all unread and write read=true
      const directRef = collection(db, `users/${userId}/notifications`);
      const unreadQuery = query(directRef, where('read', '==', false));
      const querySnap = await getDocs(unreadQuery);
      
      const promises = querySnap.docs.map(docSnap => 
        updateDoc(doc(db, `users/${userId}/notifications`, docSnap.id), { read: true })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Failed to bulk mark as read:", e);
    }
  }
}
