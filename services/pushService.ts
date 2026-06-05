// Helper to convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const PushService = {
  /**
   * Registers the Service Worker.
   */
  registerSW: async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered successfully with scope:', registration.scope);
        return registration;
      } catch (err) {
        console.error('❌ Service Worker registration failed:', err);
      }
    }
    return null;
  },

  /**
   * Fetches VAPID public key, requests permissions, creates sub, sends to API.
   */
  subscribeToPush: async (userId: string | null = null) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Web Push Notifications are not supported in this browser.');
      return false;
    }

    try {
      // Ensure Service Worker is registered and ready
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        console.error('Service worker not active or ready.');
        return false;
      }

      // 1. Request Browser Notifications Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission was denied by user.');
        return false;
      }

      // 2. Fetch public key from our server-side API
      const resKey = await fetch('/api/push/vapid-public-key');
      if (!resKey.ok) {
        throw new Error(`Failed to fetch VAPID key. Status: ${resKey.status}`);
      }
      const { publicKey } = await resKey.json();
      if (!publicKey) {
        throw new Error('VAPID public key was empty');
      }

      // 3. Subscribe the user
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('✅ Created push subscription:', subscription);

      // 4. Send subscription info to database
      const resSub = await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'guest',
          subscription
        })
      });

      if (!resSub.ok) {
        throw new Error('Failed to save push subscription on the server.');
      }

      console.log('🚀 Push subscription integrated successfully is server.');
      return true;
    } catch (err) {
      console.error('Error during push notification setup:', err);
      return false;
    }
  },

  /**
   * Syncs reminders to backend so server-side polling can send Web Push alerts.
   */
  syncReminders: async (userId: string | null, reminders: any[]) => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      const res = await fetch('/api/push/sync-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'guest',
          subscription,
          reminders
        })
      });
      if (!res.ok) {
        console.warn('Reminder backend sync returned status:', res.status);
      }
    } catch (e) {
      console.error('Failed to sync reminders to Express backend:', e);
    }
  },

  /**
   * Helper to trigger a manual test push.
   */
  testPushNotification: async (userId: string | null, title: string, message: string) => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      const res = await fetch('/api/push/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          title,
          body: message
        })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('Error triggering push test:', e);
      return { success: false, error: e };
    }
  }
};
