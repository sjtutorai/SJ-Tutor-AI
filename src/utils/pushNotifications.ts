/**
 * Support for Web Push Notifications on Mobile/Desktop Browsers
 */

// Helper to convert base64 (for VAPID key) to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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

export const isPushSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const getSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (e) {
    console.warn("⚠️ [Push] getSubscription error or sandboxed environment skipped:", e);
    return null;
  }
};

export const registerServiceWorkerAndSubscribe = async (userId: string | null): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    console.warn("Push notifications are not supported on this device/browser.");
    return null;
  }

  try {
    // 1. Request Browser Notifications Permission if not already prompted
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error("Notification permission was not granted.");
    }

    // 2. Register Service Worker from public root
    console.log("Registering Service Worker...");
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log("Service Worker registered successfully:", registration);
    } catch (swErr: any) {
      console.warn("⚠️ Service Worker registration skipped or failed in this context:", swErr?.message || swErr);
      return null;
    }

    // Wait for the service worker to become ready
    try {
      await navigator.serviceWorker.ready;
    } catch (readyErr) {
      console.warn("⚠️ Service Worker ready status check skipped:", readyErr);
      return null;
    }

    // 3. Retrieve VAPID Public Key from the server
    const keyResponse = await fetch('/api/notifications/vapid-public-key');
    if (!keyResponse.ok) {
      throw new Error(`Failed to fetch VAPID public key: ${keyResponse.statusText}`);
    }
    const { publicKey } = await keyResponse.json();
    if (!publicKey) {
      throw new Error("VAPID public key is empty or invalid on server.");
    }

    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // 4. Subscribe the browser user to Push Service
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log("User is not subscribed. Creating new subscription...");
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    console.log("Successfully subscribed to Push Manager:", subscription);

    // 5. Send subscription parameters to the backend
    const syncResponse = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId || 'guest',
        subscription
      })
    });

    if (!syncResponse.ok) {
      throw new Error(`Failed to save subscription on server: ${syncResponse.statusText}`);
    }

    // Also sync existing local reminders so they are immediately registered on the server
    const localRemindersKey = userId ? `reminders_${userId}` : 'reminders_guest';
    const saved = localStorage.getItem(localRemindersKey);
    if (saved) {
      try {
        const reminders = JSON.parse(saved);
        await syncRemindersWithServer(userId, reminders);
      } catch (e) {
        console.warn("Failed to parsed and synced initial reminders:", e);
      }
    }

    return subscription;
  } catch (error: any) {
    console.warn("⚠️ Error registering / subscribing push notification:", error?.message || error);
    return null;
  }
};

export const syncRemindersWithServer = async (userId: string | null, reminders: any[]) => {
  if (!isPushSupported()) return;

  try {
    let registration;
    try {
      registration = await navigator.serviceWorker.ready;
    } catch (err) {
      return;
    }
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.warn("[Push] Cannot sync reminders to server - no active push subscription found.");
      return;
    }

    await fetch('/api/notifications/sync-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId || 'guest',
        subscription,
        reminders
      })
    });
    console.log("[Push] Synced reminders to background push server successfully.");
  } catch (e: any) {
    console.warn("[Push] Error syncing reminders with backend server:", e?.message || e);
  }
};

export const sendTestPush = async (userId: string | null, title: string, message: string): Promise<boolean> => {
  if (!isPushSupported()) return false;
  
  try {
    let registration;
    try {
      registration = await navigator.serviceWorker.ready;
    } catch (err) {
      return false;
    }
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      throw new Error("No active push subscription. Subscribe first!");
    }

    const response = await fetch('/api/notifications/test-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId || 'guest',
        title,
        message
      })
    });

    return response.ok;
  } catch (e: any) {
    console.warn("[Push] Error trigger test push:", e?.message || e);
    return false;
  }
};
