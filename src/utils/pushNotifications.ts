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

let isLocalSWActive = false;

// Safe utility to check registrations and see if SW is registered
async function checkSWStatus(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    if (regs && regs.length > 0) {
      isLocalSWActive = true;
      return true;
    }
  } catch (e) {
    isLocalSWActive = false;
    return false;
  }
  return isLocalSWActive;
}

// Safe wrapper around navigator.serviceWorker.ready with a 3-second timeout to prevent hangs
async function getSafeReadyRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  
  const isOk = await checkSWStatus();
  if (!isOk) {
    return null;
  }

  try {
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const result = await Promise.race([readyPromise, timeoutPromise]);
    return result;
  } catch (err) {
    return null;
  }
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
  const registration = await getSafeReadyRegistration();
  if (!registration) return null;
  return await registration.pushManager.getSubscription();
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
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log("Service Worker registered successfully:", registration);
      isLocalSWActive = true;
    } catch (swErr: any) {
      isLocalSWActive = false;
      const isInvalidState = swErr && (swErr.name === 'InvalidStateError' || swErr.message?.includes('invalid state') || swErr.message?.includes('sandbox'));
      if (isInvalidState) {
        console.log("Service Worker registration skipped: running in an iframe / invalid-state sandbox.");
        return null;
      }
      throw swErr;
    }

    // Wait for the service worker to become ready
    const registration = await getSafeReadyRegistration();
    if (!registration) {
      console.log("Service Worker registration ready check failed or timed out.");
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
    const isInvalidState = error && (error.name === 'InvalidStateError' || error.message?.includes('invalid state') || error.message?.includes('sandbox'));
    if (isInvalidState) {
      console.log("Error registering / subscribing push notification: running in sandboxed environment.");
    } else {
      console.log("Error registering / subscribing push notification:", error);
    }
    throw error;
  }
};

export const syncRemindersWithServer = async (userId: string | null, reminders: any[]) => {
  if (!isPushSupported()) return;

  try {
    const registration = await getSafeReadyRegistration();
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
  } catch (e) {
    console.log("[Push] Error syncing reminders with backend server:", e);
  }
};

export const sendTestPush = async (userId: string | null, title: string, message: string): Promise<boolean> => {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await getSafeReadyRegistration();
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
  } catch (e) {
    console.log("[Push] Error trigger test push:", e);
    return false;
  }
};
