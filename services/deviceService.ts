import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  updateDoc 
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  timezone: string;
  ip?: string;
  loginTime: number;
  lastActive: number;
  status: 'active' | 'revoked';
  isCurrentDevice?: boolean;
  userAgent?: string;
}

const DEVICE_ID_KEY = "sjtutor_device_session_id";
const DEVICE_LOGIN_TIME_KEY = "sjtutor_device_login_time";

/**
 * Get or create a persistent unique identifier for this browser/device.
 */
export function getCurrentDeviceId(): string {
  if (typeof window === 'undefined') return "server_device";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Parse client information (OS, Browser, Device Type, Friendly Name).
 */
export function detectDeviceInfo(): {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  deviceName: string;
  timezone: string;
} {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'unknown',
      os: 'Unknown OS',
      browser: 'Unknown Browser',
      deviceName: 'Device',
      timezone: 'UTC',
    };
  }

  const ua = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
  
  // Detect OS
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 11 / 10';
  else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
  else if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/iPhone/i.test(ua)) os = 'iOS (iPhone)';
  else if (/iPad/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) os = 'iPadOS (iPad)';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS (Mac)';
  else if (/Android/i.test(ua)) os = 'Android OS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Detect Browser
  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Brave/i.test(ua) || (navigator as any).brave) browser = 'Brave';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';

  // Detect Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  const isMobileUa = /Mobi|Android|iPhone|iPod/i.test(ua);
  const isTabletUa = /iPad|Tablet|PlayBook/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isTabletUa) {
    deviceType = 'tablet';
  } else if (isMobileUa) {
    deviceType = 'mobile';
  } else {
    deviceType = 'desktop';
  }

  // Friendly Device Name
  let deviceName = `${os} • ${browser}`;
  if (deviceType === 'mobile') {
    deviceName = /iPhone/i.test(ua) ? `iPhone • ${browser}` : `Android Phone • ${browser}`;
  } else if (deviceType === 'tablet') {
    deviceName = /iPad/i.test(ua) ? `iPad • ${browser}` : `Tablet • ${browser}`;
  } else if (os.includes('Windows')) {
    deviceName = `Windows PC • ${browser}`;
  } else if (os.includes('macOS')) {
    deviceName = `MacBook / iMac • ${browser}`;
  } else if (os.includes('Linux')) {
    deviceName = `Linux PC • ${browser}`;
  }

  // Timezone & region
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    timezone = 'UTC';
  }

  return {
    deviceType,
    os,
    browser,
    deviceName,
    timezone,
  };
}

export class DeviceService {
  private static heartbeatInterval: any = null;

  /**
   * Register or update the current device session in Firestore.
   */
  static async registerCurrentDevice(userId: string): Promise<DeviceSession | null> {
    if (!userId) return null;

    try {
      const deviceId = getCurrentDeviceId();
      const detected = detectDeviceInfo();
      const deviceRef = doc(db, "users", userId, "devices", deviceId);

      let loginTime = Date.now();
      const storedLoginTime = localStorage.getItem(DEVICE_LOGIN_TIME_KEY);
      if (storedLoginTime) {
        loginTime = parseInt(storedLoginTime, 10) || Date.now();
      } else {
        localStorage.setItem(DEVICE_LOGIN_TIME_KEY, loginTime.toString());
      }

      // Check if session doc already exists in Firestore
      const existingDoc = await getDoc(deviceRef);
      if (existingDoc.exists()) {
        const existingData = existingDoc.data() as DeviceSession;
        if (existingData.loginTime) {
          loginTime = existingData.loginTime;
        }
      }

      const sessionData: DeviceSession = {
        deviceId,
        deviceName: detected.deviceName,
        deviceType: detected.deviceType,
        os: detected.os,
        browser: detected.browser,
        timezone: detected.timezone,
        loginTime,
        lastActive: Date.now(),
        status: 'active',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };

      await setDoc(deviceRef, sessionData, { merge: true });

      // Start periodic heartbeat (every 2 minutes)
      this.startHeartbeat(userId, deviceId);

      return {
        ...sessionData,
        isCurrentDevice: true,
      };
    } catch (error) {
      console.warn("[DeviceService] Failed to register device session:", error);
      return null;
    }
  }

  /**
   * Start periodic heartbeat to update lastActive timestamp.
   */
  static startHeartbeat(userId: string, deviceId: string) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        if (!auth.currentUser || auth.currentUser.uid !== userId) {
          this.stopHeartbeat();
          return;
        }
        const deviceRef = doc(db, "users", userId, "devices", deviceId);
        await updateDoc(deviceRef, {
          lastActive: Date.now(),
          status: 'active',
        }).catch(() => {});
      } catch (err) {
        console.warn("[DeviceService] Heartbeat notice:", err);
      }
    }, 2 * 60 * 1000); // 2 minutes
  }

  static stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Subscribe in real-time to all logged-in devices for the user.
   */
  static subscribeToUserDevices(
    userId: string, 
    onDevicesChange: (devices: DeviceSession[]) => void
  ): () => void {
    if (!userId) {
      onDevicesChange([]);
      return () => {};
    }

    const currentDeviceId = getCurrentDeviceId();
    const devicesColRef = collection(db, "users", userId, "devices");

    const unsubscribe = onSnapshot(devicesColRef, (snapshot) => {
      const list: DeviceSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DeviceSession;
        if (data.status !== 'revoked') {
          list.push({
            ...data,
            deviceId: docSnap.id,
            isCurrentDevice: docSnap.id === currentDeviceId,
          });
        }
      });

      // Sort: current device always first, followed by newest lastActive
      list.sort((a, b) => {
        if (a.isCurrentDevice) return -1;
        if (b.isCurrentDevice) return 1;
        return (b.lastActive || 0) - (a.lastActive || 0);
      });

      onDevicesChange(list);
    }, (error) => {
      console.warn("[DeviceService] Device subscription error:", error);
    });

    return unsubscribe;
  }

  /**
   * Listen for remote revocation of the current device.
   */
  static listenForRevocation(
    userId: string, 
    onRevoked: () => void
  ): () => void {
    if (!userId) return () => {};

    const currentDeviceId = getCurrentDeviceId();
    const currentDeviceRef = doc(db, "users", userId, "devices", currentDeviceId);

    return onSnapshot(currentDeviceRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DeviceSession;
        if (data.status === 'revoked') {
          onRevoked();
        }
      }
    }, (err) => {
      console.warn("[DeviceService] Revocation check error:", err);
    });
  }

  /**
   * Logout/Revoke a specific device.
   */
  static async logoutDevice(userId: string, targetDeviceId: string): Promise<boolean> {
    try {
      const currentDeviceId = getCurrentDeviceId();
      const isCurrent = targetDeviceId === currentDeviceId;

      const deviceRef = doc(db, "users", userId, "devices", targetDeviceId);
      
      // Delete document from Firestore
      await deleteDoc(deviceRef);

      if (isCurrent) {
        localStorage.removeItem(DEVICE_LOGIN_TIME_KEY);
        this.stopHeartbeat();
        await signOut(auth);
      }

      return true;
    } catch (error) {
      console.error("[DeviceService] Failed to logout device:", error);
      return false;
    }
  }

  /**
   * Logout from all other devices except this current one.
   */
  static async logoutAllOtherDevices(userId: string): Promise<number> {
    try {
      const currentDeviceId = getCurrentDeviceId();
      const devicesColRef = collection(db, "users", userId, "devices");
      const snapshot = await getDocs(devicesColRef);

      let removedCount = 0;
      const deletePromises: Promise<void>[] = [];

      snapshot.forEach((docSnap) => {
        if (docSnap.id !== currentDeviceId) {
          removedCount++;
          deletePromises.push(deleteDoc(doc(db, "users", userId, "devices", docSnap.id)));
        }
      });

      await Promise.all(deletePromises);
      return removedCount;
    } catch (error) {
      console.error("[DeviceService] Failed to logout other devices:", error);
      return 0;
    }
  }

  /**
   * Format human-readable date & time for login and activity.
   */
  static formatDateTime(timestamp: number): { full: string; date: string; time: string; relative: string } {
    if (!timestamp || isNaN(timestamp)) {
      return { full: 'Unknown date', date: 'Unknown', time: 'Unknown', relative: 'Unknown' };
    }

    const dateObj = new Date(timestamp);
    
    // Format full date & time (e.g. Aug 25, 2026 at 01:45 PM)
    const dateFormatted = dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const timeFormatted = dateObj.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const full = `${dateFormatted} at ${timeFormatted}`;

    // Relative string
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = 'Just now';
    if (diffMins < 2) {
      relative = 'Active now';
    } else if (diffMins < 60) {
      relative = `${diffMins} min ago`;
    } else if (diffHours < 24) {
      relative = `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      relative = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      relative = dateFormatted;
    }

    return {
      full,
      date: dateFormatted,
      time: timeFormatted,
      relative,
    };
  }
}
