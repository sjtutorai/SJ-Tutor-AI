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

// Elegant default seeded notifications with 50 custom notifications
const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'seed-1',
    title: 'Ready to learn? 📚',
    body: "Open SJ Tutor AI and start today's study session!",
    category: 'Daily Streak Reminders',
    read: false,
    createdAt: Date.now() - 300000, // 5 minutes ago
    userId: 'all'
  },
  {
    id: 'seed-2',
    title: 'Study Streak Alert! 🔥',
    body: "Your study streak is waiting! Don't break it today.",
    category: 'Daily Streak Reminders',
    read: false,
    createdAt: Date.now() - 1800000, // 30 minutes ago
    userId: 'all'
  },
  {
    id: 'seed-3',
    title: 'Quick Revision Time ⏰',
    body: 'Time for a quick revision. Just 10 minutes can make a big difference.',
    category: 'Daily Streak Reminders',
    read: false,
    createdAt: Date.now() - 3600000, // 1 hour ago
    userId: 'all'
  },
  {
    id: 'seed-4',
    title: 'Ask Anything 🧠',
    body: 'Ask your AI Tutor any question and learn instantly.',
    category: 'New Features',
    read: false,
    createdAt: Date.now() - 7200000, // 2 hours ago
    userId: 'all'
  },
  {
    id: 'seed-5',
    title: 'A New Opportunity ✨',
    body: 'A new day means a new opportunity to improve your knowledge.',
    category: 'Daily Streak Reminders',
    read: false,
    createdAt: Date.now() - 10800000, // 3 hours ago
    userId: 'all'
  },
  {
    id: 'seed-6',
    title: 'Daily Goal 🎯',
    body: "Complete today's learning goal and stay ahead.",
    category: 'Important Alerts',
    read: false,
    createdAt: Date.now() - 14400000, // 4 hours ago
    userId: 'all'
  },
  {
    id: 'seed-7',
    title: "Yesterday's Topics 📖",
    body: "Revision time! Review yesterday's topics.",
    category: 'Daily Streak Reminders',
    read: false,
    createdAt: Date.now() - 18000000, // 5 hours ago
    userId: 'all'
  },
  {
    id: 'seed-8',
    title: 'Consistency is Key 💪',
    body: 'Small efforts every day lead to big achievements.',
    category: 'Daily Streak Reminders',
    read: false,
    createdAt: Date.now() - 21600000, // 6 hours ago
    userId: 'all'
  },
  {
    id: 'seed-9',
    title: 'Consistent Progress 🎉',
    body: "Great job! You're making consistent progress.",
    category: 'Daily Streak Reminders',
    read: false,
    createdAt: Date.now() - 25200000, // 7 hours ago
    userId: 'all'
  },
  {
    id: 'seed-10',
    title: 'Exam Reminder 📅',
    body: "Don't forget to check your exam timetable.",
    category: 'Important Alerts',
    read: false,
    createdAt: Date.now() - 28800000, // 8 hours ago
    userId: 'all'
  },
  {
    id: 'seed-11',
    title: 'Practice Quiz 📝',
    body: 'Solve a practice quiz and test your understanding.',
    category: 'Quiz Updates',
    read: true,
    createdAt: Date.now() - 36000000, // 10 hours ago
    userId: 'all'
  },
  {
    id: 'seed-12',
    title: 'Step Closer to Success 🚀',
    body: 'Every lesson completed brings you closer to success.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 43200000, // 12 hours ago
    userId: 'all'
  },
  {
    id: 'seed-13',
    title: 'Streak Guardian 🌟',
    body: 'Keep your learning streak alive today.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 50400000, // 14 hours ago
    userId: 'all'
  },
  {
    id: 'seed-14',
    title: 'Stuck on a Concept? 💡',
    body: 'Confused about a topic? Let AI explain it simply.',
    category: 'New Features',
    read: true,
    createdAt: Date.now() - 57600000, // 16 hours ago
    userId: 'all'
  },
  {
    id: 'seed-15',
    title: 'Invest in Yourself 📈',
    body: 'Your future self will thank you for studying today.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 64800000, // 18 hours ago
    userId: 'all'
  },
  {
    id: 'seed-16',
    title: 'Keep Going 🎓',
    body: 'Learning never stops. Continue where you left off.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 72000000, // 20 hours ago
    userId: 'all'
  },
  {
    id: 'seed-17',
    title: 'Confidence Builder ⏳',
    body: 'Just 15 minutes of study can improve your confidence.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 79200000, // 22 hours ago
    userId: 'all'
  },
  {
    id: 'seed-18',
    title: 'Unlock Achievements 🏆',
    body: 'Complete another lesson to unlock new achievements.',
    category: 'Competition Announcements',
    read: true,
    createdAt: Date.now() - 86400000, // 1 day ago
    userId: 'all'
  },
  {
    id: 'seed-19',
    title: 'Next Chapter 📚',
    body: 'Your next chapter is waiting for you.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 93600000, // 1.1 days ago
    userId: 'all'
  },
  {
    id: 'seed-20',
    title: 'Study Time Bell 🔔',
    body: "Don't miss today's study session.",
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 100800000, // 1.2 days ago
    userId: 'all'
  },
  {
    id: 'seed-21',
    title: 'Practice Makes Perfect 🧪',
    body: 'Practice makes perfect. Solve a few questions now.',
    category: 'Quiz Updates',
    read: true,
    createdAt: Date.now() - 108000000, // 1.25 days ago
    userId: 'all'
  },
  {
    id: 'seed-22',
    title: 'Smarter Tomorrow 📖',
    body: 'Read one concept today and become smarter tomorrow.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 115200000, // 1.3 days ago
    userId: 'all'
  },
  {
    id: 'seed-23',
    title: 'Tutor is Ready 🤖',
    body: 'AI Tutor is online and ready to help.',
    category: 'New Features',
    read: true,
    createdAt: Date.now() - 122400000, // 1.4 days ago
    userId: 'all'
  },
  {
    id: 'seed-24',
    title: 'Daily Tasks 🎯',
    body: "Finish today's tasks before the day ends.",
    category: 'Important Alerts',
    read: true,
    createdAt: Date.now() - 129600000, // 1.5 days ago
    userId: 'all'
  },
  {
    id: 'seed-25',
    title: 'Build Confidence 🌈',
    body: 'Every correct answer builds your confidence.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 136800000, // 1.6 days ago
    userId: 'all'
  },
  {
    id: 'seed-26',
    title: 'Almost There 🏅',
    body: "You're closer to your learning goals than you think.",
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 144000000, // 1.7 days ago
    userId: 'all'
  },
  {
    id: 'seed-27',
    title: 'Homework Rescue 📚',
    body: 'Need homework help? Open SJ Tutor AI now.',
    category: 'Important Alerts',
    read: true,
    createdAt: Date.now() - 151200000, // 1.75 days ago
    userId: 'all'
  },
  {
    id: 'seed-28',
    title: 'Grow Everyday ✨',
    body: 'Keep learning, keep growing.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 158400000, // 1.8 days ago
    userId: 'all'
  },
  {
    id: 'seed-29',
    title: 'Brain Challenge 🧠',
    body: "Challenge yourself with today's quiz.",
    category: 'Quiz Updates',
    read: true,
    createdAt: Date.now() - 172800000, // 2 days ago
    userId: 'all'
  },
  {
    id: 'seed-30',
    title: 'Improve Everyday 📊',
    body: 'Track your progress and improve every day.',
    category: 'New Features',
    read: true,
    createdAt: Date.now() - 187200000, // 2.2 days ago
    userId: 'all'
  },
  {
    id: 'seed-31',
    title: 'Milestone Awaits 🎉',
    body: 'Congratulations! Another milestone is within reach.',
    category: 'Competition Announcements',
    read: true,
    createdAt: Date.now() - 201600000, // 2.3 days ago
    userId: 'all'
  },
  {
    id: 'seed-32',
    title: 'Ask, Learn, Repeat 💬',
    body: 'Ask, Learn, Repeat with SJ Tutor AI.',
    category: 'New Features',
    read: true,
    createdAt: Date.now() - 216000000, // 2.5 days ago
    userId: 'all'
  },
  {
    id: 'seed-33',
    title: 'Beat the Stress 📖',
    body: 'A little revision today prevents stress tomorrow.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 230400000, // 2.7 days ago
    userId: 'all'
  },
  {
    id: 'seed-34',
    title: 'Stay Focused 🚀',
    body: "Stay focused. Success starts with today's effort.",
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 244800000, // 2.8 days ago
    userId: 'all'
  },
  {
    id: 'seed-35',
    title: 'Explore Something New 📚',
    body: 'Open a subject and explore something new today.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 259200000, // 3 days ago
    userId: 'all'
  },
  {
    id: 'seed-36',
    title: 'Protect your Streak 🔥',
    body: 'Your streak deserves another day of success.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 273600000, // 3.2 days ago
    userId: 'all'
  },
  {
    id: 'seed-37',
    title: 'Superpower 🌟',
    body: 'Learning is your superpower.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 288000000, // 3.3 days ago
    userId: 'all'
  },
  {
    id: 'seed-38',
    title: 'Dream Big 🎓',
    body: 'Every lesson completed is a step toward your dream.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 302400000, // 3.5 days ago
    userId: 'all'
  },
  {
    id: 'seed-39',
    title: 'Exam Prep 📅',
    body: 'Upcoming exam? Start preparing today.',
    category: 'Important Alerts',
    read: true,
    createdAt: Date.now() - 316800000, // 3.7 days ago
    userId: 'all'
  },
  {
    id: 'seed-40',
    title: 'Perform Better 📝',
    body: 'Practice now, perform better later.',
    category: 'Quiz Updates',
    read: true,
    createdAt: Date.now() - 331200000, // 3.8 days ago
    userId: 'all'
  },
  {
    id: 'seed-41',
    title: 'Smart Study 💡',
    body: 'Smart students revise regularly. Join them!',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 345600000, // 4 days ago
    userId: 'all'
  },
  {
    id: 'seed-42',
    title: 'Instant Explanations 📚',
    body: 'Discover AI-powered explanations in seconds.',
    category: 'New Features',
    read: true,
    createdAt: Date.now() - 360000000, // 4.2 days ago
    userId: 'all'
  },
  {
    id: 'seed-43',
    title: 'Chapter Goal 🎯',
    body: 'Finish one chapter before taking a break.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 374400000, // 4.3 days ago
    userId: 'all'
  },
  {
    id: 'seed-44',
    title: 'Brain Teaser 🧩',
    body: 'Challenge your brain with today\'s questions.',
    category: 'Quiz Updates',
    read: true,
    createdAt: Date.now() - 388800000, // 4.5 days ago
    userId: 'all'
  },
  {
    id: 'seed-45',
    title: 'One Step at a Time 🏆',
    body: 'Success is built one study session at a time.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 403200000, // 4.7 days ago
    userId: 'all'
  },
  {
    id: 'seed-46',
    title: 'Be Productive 🚀',
    body: 'Make today productive with SJ Tutor AI.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 417600000, // 4.8 days ago
    userId: 'all'
  },
  {
    id: 'seed-47',
    title: 'Onward & Upward 📖',
    body: "Your learning journey continues. Let's go!",
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 432000000, // 5 days ago
    userId: 'all'
  },
  {
    id: 'seed-48',
    title: 'Unlock Potential 🔔',
    body: 'Time to unlock your full potential.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 446400000, // 5.2 days ago
    userId: 'all'
  },
  {
    id: 'seed-49',
    title: 'Believe 🌟',
    body: 'Believe in yourself. Keep studying consistently.',
    category: 'Daily Streak Reminders',
    read: true,
    createdAt: Date.now() - 460800000, // 5.3 days ago
    userId: 'all'
  },
  {
    id: 'seed-50',
    title: 'With Love ❤️',
    body: 'Thank you for learning with SJ Tutor AI. Keep shining!',
    category: 'Important Alerts',
    read: true,
    createdAt: Date.now() - 475200000, // 5.5 days ago
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
      } catch {
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
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length < 20) {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
        return DEFAULT_NOTIFICATIONS;
      }
      return parsed;
    } catch {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
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
