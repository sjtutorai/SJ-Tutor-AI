import webpush from "web-push";
import fs from "fs";
import path from "path";

// Data directory for persistent server-side push subscriptions & VAPID keys
const DATA_DIR = path.join(process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[Push Service] Error creating data directory:", err);
}

const VAPID_FILE = path.join(DATA_DIR, "vapid-keys.json");
const SUBS_FILE = path.join(DATA_DIR, "push-subscriptions.json");

interface PushSubscriptionEntry {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string;
  userAgent?: string;
  updatedAt: number;
}

class PushNotificationService {
  private vapidKeys: { publicKey: string; privateKey: string };
  private subscriptions: Map<string, PushSubscriptionEntry[]> = new Map();

  constructor() {
    this.vapidKeys = this.loadOrGenerateVapidKeys();
    this.loadSubscriptions();

    try {
      webpush.setVapidDetails(
        "mailto:sjtutorai@gmail.com",
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );
      console.log("[Push Service] VAPID configured successfully. Public key:", this.vapidKeys.publicKey.slice(0, 15) + "...");
    } catch (err) {
      console.error("[Push Service] Failed to initialize VAPID:", err);
    }
  }

  private loadOrGenerateVapidKeys(): { publicKey: string; privateKey: string } {
    // 1. Check environment variables first
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      return {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
      };
    }

    // 2. Check local file storage
    if (fs.existsSync(VAPID_FILE)) {
      try {
        const raw = fs.readFileSync(VAPID_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.publicKey && parsed.privateKey) {
          return parsed;
        }
      } catch (err) {
        console.warn("[Push Service] Error reading vapid-keys.json, generating new pair:", err);
      }
    }

    // 3. Generate a new stable pair and save
    const keys = webpush.generateVAPIDKeys();
    try {
      fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), "utf-8");
    } catch (err) {
      console.warn("[Push Service] Error writing vapid-keys.json:", err);
    }
    return keys;
  }

  private loadSubscriptions() {
    if (fs.existsSync(SUBS_FILE)) {
      try {
        const raw = fs.readFileSync(SUBS_FILE, "utf-8");
        const parsed: Record<string, PushSubscriptionEntry[]> = JSON.parse(raw);
        for (const [userId, subs] of Object.entries(parsed)) {
          if (Array.isArray(subs)) {
            this.subscriptions.set(userId, subs);
          }
        }
        console.log(`[Push Service] Loaded push subscriptions for ${this.subscriptions.size} users.`);
      } catch (err) {
        console.warn("[Push Service] Error reading push-subscriptions.json:", err);
      }
    }
  }

  private persistSubscriptions() {
    try {
      const obj: Record<string, PushSubscriptionEntry[]> = {};
      for (const [userId, subs] of this.subscriptions.entries()) {
        obj[userId] = subs;
      }
      fs.writeFileSync(SUBS_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (err) {
      console.warn("[Push Service] Error saving push-subscriptions.json:", err);
    }
  }

  public getPublicKey(): string {
    return this.vapidKeys.publicKey;
  }

  public saveSubscription(userId: string, subscription: any, userAgent?: string): boolean {
    if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
      return false;
    }

    const currentSubs = this.subscriptions.get(userId) || [];
    const filtered = currentSubs.filter((s) => s.endpoint !== subscription.endpoint);

    const newEntry: PushSubscriptionEntry = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime || null,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userId,
      userAgent: userAgent || "unknown",
      updatedAt: Date.now(),
    };

    filtered.push(newEntry);
    this.subscriptions.set(userId, filtered);
    this.persistSubscriptions();
    console.log(`[Push Service] Registered push subscription for user ${userId}. Total devices: ${filtered.length}`);
    return true;
  }

  public removeSubscription(endpoint: string, userId?: string): void {
    if (userId) {
      const currentSubs = this.subscriptions.get(userId) || [];
      const updated = currentSubs.filter((s) => s.endpoint !== endpoint);
      if (updated.length > 0) {
        this.subscriptions.set(userId, updated);
      } else {
        this.subscriptions.delete(userId);
      }
    } else {
      for (const [uid, subs] of this.subscriptions.entries()) {
        const updated = subs.filter((s) => s.endpoint !== endpoint);
        if (updated.length !== subs.length) {
          if (updated.length > 0) {
            this.subscriptions.set(uid, updated);
          } else {
            this.subscriptions.delete(uid);
          }
        }
      }
    }
    this.persistSubscriptions();
  }

  public async sendCallPushNotification(
    receiverId: string,
    callData: {
      callId: string;
      callerId?: string;
      callerName: string;
      callerAvatar?: string;
      type: "audio" | "video";
    }
  ): Promise<{ sentCount: number; failureCount: number }> {
    const userSubs = this.subscriptions.get(receiverId) || [];
    console.log(`[Push Service] Sending incoming call push to user ${receiverId} (${userSubs.length} active devices)...`);

    if (userSubs.length === 0) {
      console.log(`[Push Service] User ${receiverId} has no registered push devices currently.`);
      return { sentCount: 0, failureCount: 0 };
    }

    const callTypeLabel = callData.type === "video" ? "Video" : "Voice";
    const payload = JSON.stringify({
      title: `📞 Incoming ${callTypeLabel} Call`,
      body: `${callData.callerName || "A Scholar"} is calling you on SJ Tutor AI. Tap Accept to connect.`,
      notification: {
        title: `📞 Incoming ${callTypeLabel} Call`,
        body: `${callData.callerName || "A Scholar"} is calling you on SJ Tutor AI. Tap Accept to connect.`,
        icon: callData.callerAvatar || "https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg",
        badge: "https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg",
        tag: `call_${callData.callId}`,
      },
      data: {
        type: "call",
        callId: callData.callId,
        callerId: callData.callerId || "",
        callerName: callData.callerName,
        callerAvatar: callData.callerAvatar || "https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg",
        callType: callData.type,
        url: `/?action=accept_call&callId=${encodeURIComponent(callData.callId)}`,
        category: "Important Alerts",
        notificationId: `call_${callData.callId}`,
      },
    });

    let sentCount = 0;
    let failureCount = 0;

    const promises = userSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload,
          {
            TTL: 60, // 60 seconds Time To Live for real-time ringing call
            urgency: "high", // High urgency wakes sleeping devices
            topic: `incoming-call-${callData.callId}`,
          }
        );
        sentCount++;
      } catch (err: any) {
        failureCount++;
        console.warn(`[Push Service] Push delivery failed for endpoint ${sub.endpoint.slice(0, 30)}... Error:`, err.statusCode || err.message);
        // Clean up expired or invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[Push Service] Removing expired subscription for user ${receiverId}`);
          this.removeSubscription(sub.endpoint, receiverId);
        }
      }
    });

    await Promise.all(promises);
    return { sentCount, failureCount };
  }

  public async sendDismissCallPushNotification(
    receiverId: string,
    callId: string
  ): Promise<{ sentCount: number; failureCount: number }> {
    const userSubs = this.subscriptions.get(receiverId) || [];
    if (userSubs.length === 0 || !callId) {
      return { sentCount: 0, failureCount: 0 };
    }

    const payload = JSON.stringify({
      data: {
        type: "dismiss_call",
        action: "dismiss_call",
        callId,
      },
    });

    let sentCount = 0;
    let failureCount = 0;

    const promises = userSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload,
          {
            TTL: 30,
            urgency: "high",
            topic: `dismiss-call-${callId}`,
          }
        );
        sentCount++;
      } catch (err: any) {
        failureCount++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          this.removeSubscription(sub.endpoint, receiverId);
        }
      }
    });

    await Promise.all(promises);
    return { sentCount, failureCount };
  }

  public async sendGeneralPushNotification(
    receiverId: string,
    notif: {
      title: string;
      body: string;
      category?: string;
      url?: string;
    }
  ): Promise<{ sentCount: number; failureCount: number }> {
    const userSubs = receiverId === "all" 
      ? Array.from(this.subscriptions.values()).flat()
      : (this.subscriptions.get(receiverId) || []);

    if (userSubs.length === 0) {
      return { sentCount: 0, failureCount: 0 };
    }

    const payload = JSON.stringify({
      title: notif.title || "SJ Tutor AI",
      body: notif.body || "You have a new update!",
      data: {
        type: "general",
        category: notif.category || "Important Alerts",
        url: notif.url || "/",
        notificationId: `notif_${Date.now()}`,
      },
    });

    let sentCount = 0;
    let failureCount = 0;

    const promises = userSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload,
          {
            TTL: 86400,
            urgency: "normal",
          }
        );
        sentCount++;
      } catch (err: any) {
        failureCount++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          this.removeSubscription(sub.endpoint);
        }
      }
    });

    await Promise.all(promises);
    return { sentCount, failureCount };
  }
}

export const pushNotificationService = new PushNotificationService();
