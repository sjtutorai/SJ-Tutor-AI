import express from "express";
import webpush from "web-push";
import fs from "fs";
import path from "path";

const router = express.Router();

const KEYS_FILE = path.join(process.cwd(), "vapid-keys.json");
const SUBS_FILE = path.join(process.cwd(), "push-subscriptions.json");

// Define structure
interface Reminder {
  id: string;
  task: string;
  dueTime: string;
  completed: boolean;
  notified?: boolean;
}

interface SubscriptionEntry {
  userId: string;
  subscription: any;
  reminders: Reminder[];
}

let vapidKeys = { publicKey: "", privateKey: "" };

// 1. Initialize VAPID Keys
try {
  if (fs.existsSync(KEYS_FILE)) {
    const raw = fs.readFileSync(KEYS_FILE, "utf-8");
    vapidKeys = JSON.parse(raw);
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(KEYS_FILE, JSON.stringify(vapidKeys, null, 2), "utf-8");
  }
} catch (e) {
  console.error("Failed to initialize VAPID keys:", e);
  vapidKeys = webpush.generateVAPIDKeys();
}

// Configure Web Push with details and keys
webpush.setVapidDetails(
  "mailto:sjtutorai@gmail.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// 2. Load Subscriptions Helper
const loadSubscriptions = (): SubscriptionEntry[] => {
  try {
    if (fs.existsSync(SUBS_FILE)) {
      const raw = fs.readFileSync(SUBS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error loading push subscriptions:", e);
  }
  return [];
};

// 3. Save Subscriptions Helper
const saveSubscriptions = (entries: SubscriptionEntry[]) => {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving push subscriptions:", e);
  }
};

// --- Endpoints ---

// Get Public Key
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Register or Update client sub + reminders list
router.post("/register", (req, res) => {
  try {
    const { userId, subscription, reminders = [] } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }

    const currentSubs = loadSubscriptions();
    const existingIndex = currentSubs.findIndex(
      (s) => s.subscription.endpoint === subscription.endpoint
    );

    const targetUserId = userId || "guest";

    if (existingIndex !== -1) {
      // Preserve previously notified states if they exist
      const oldReminders = currentSubs[existingIndex].reminders || [];
      const mergedReminders = reminders.map((r: Reminder) => {
        const oldMatch = oldReminders.find((o) => o.id === r.id);
        return {
          ...r,
          notified: oldMatch ? oldMatch.notified : false,
        };
      });

      currentSubs[existingIndex] = {
        userId: targetUserId,
        subscription,
        reminders: mergedReminders,
      };
    } else {
      const initializedReminders = reminders.map((r: Reminder) => ({
        ...r,
        notified: false,
      }));
      currentSubs.push({
        userId: targetUserId,
        subscription,
        reminders: initializedReminders,
      });
    }

    saveSubscriptions(currentSubs);
    res.json({ success: true, message: "Subscription registered successfully" });
  } catch (e: any) {
    console.error("Error in registering push subscription:", e);
    res.status(500).json({ error: e.message });
  }
});

// Sync reminders from frontend
router.post("/sync-reminders", (req, res) => {
  try {
    const { userId, subscription, reminders = [] } = req.body;
    const currentSubs = loadSubscriptions();

    // Try to find by subscription endpoint first (most precise)
    let foundIndex = -1;
    if (subscription && subscription.endpoint) {
      foundIndex = currentSubs.findIndex(
        (s) => s.subscription.endpoint === subscription.endpoint
      );
    }
    
    // Fallback to userId if not found and not guest
    if (foundIndex === -1 && userId && userId !== "guest") {
      foundIndex = currentSubs.findIndex((s) => s.userId === userId);
    }

    if (foundIndex !== -1) {
      const oldReminders = currentSubs[foundIndex].reminders || [];
      const mergedReminders = reminders.map((r: Reminder) => {
        const oldMatch = oldReminders.find((o) => o.id === r.id);
        return {
          ...r,
          // Preserve notified flags to avoid sending identical push notifications multiple times
          notified: oldMatch ? oldMatch.notified : false,
        };
      });

      currentSubs[foundIndex].reminders = mergedReminders;
      if (subscription) {
        currentSubs[foundIndex].subscription = subscription;
      }
      saveSubscriptions(currentSubs);
      return res.json({ success: true, message: "Reminders synced successfully" });
    }

    // If subscription is provided, let's create a new entry
    if (subscription && subscription.endpoint) {
      currentSubs.push({
        userId: userId || "guest",
        subscription,
        reminders: reminders.map((r: Reminder) => ({ ...r, notified: false })),
      });
      saveSubscriptions(currentSubs);
      return res.json({ success: true, message: "Created new subscription and synced" });
    }

    res.status(404).json({ error: "Active subscription not found for syncing" });
  } catch (e: any) {
    console.error("Error in sync-reminders:", e);
    res.status(500).json({ error: e.message });
  }
});

// Send Test Notification
router.post("/test-notification", async (req, res) => {
  try {
    const { subscription, title, body } = req.body;
    if (!subscription) {
      return res.status(400).json({ error: "Subscription required for test" });
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: title || "SJ Tutor AI Test",
        body: body || "This is a live test push notification!",
        url: "/?mode=notifications"
      })
    );

    res.json({ success: true, message: "Test push sent successfully!" });
  } catch (e: any) {
    console.error("Error sending test push:", e);
    res.status(500).json({ error: e.message });
  }
});

// Alias Subscribe for backward compatibility with pushNotifications.ts
router.post("/subscribe", (req, res) => {
  try {
    const { userId, subscription, reminders = [] } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }

    const currentSubs = loadSubscriptions();
    const existingIndex = currentSubs.findIndex(
      (s) => s.subscription.endpoint === subscription.endpoint
    );

    const targetUserId = userId || "guest";

    if (existingIndex !== -1) {
      const oldReminders = currentSubs[existingIndex].reminders || [];
      const mergedReminders = reminders.map((r: Reminder) => {
        const oldMatch = oldReminders.find((o) => o.id === r.id);
        return {
          ...r,
          notified: oldMatch ? oldMatch.notified : false,
        };
      });

      currentSubs[existingIndex] = {
        userId: targetUserId,
        subscription,
        reminders: mergedReminders,
      };
    } else {
      const initializedReminders = reminders.map((r: Reminder) => ({
        ...r,
        notified: false,
      }));
      currentSubs.push({
        userId: targetUserId,
        subscription,
        reminders: initializedReminders,
      });
    }

    saveSubscriptions(currentSubs);
    res.json({ success: true, message: "Subscription registered successfully" });
  } catch (e: any) {
    console.error("Error in registering push subscription:", e);
    res.status(500).json({ error: e.message });
  }
});

// Test Push looking up by userId for backward compatibility with pushNotifications.ts
router.post("/test-push", async (req, res) => {
  try {
    const { userId, title, message } = req.body;
    const targetUserId = userId || "guest";
    const currentSubs = loadSubscriptions();

    const userSubs = currentSubs.filter((s) => s.userId === targetUserId);
    if (userSubs.length === 0) {
      return res.status(404).json({ error: "No active push subscriptions found for this user in database." });
    }

    const payload = JSON.stringify({
      title: title || "SJ Study Test 💡",
      body: message || "Offline test push notification succeeded!",
      url: "/?mode=notifications"
    });

    let successCount = 0;
    for (const entry of userSubs) {
      try {
        await webpush.sendNotification(entry.subscription, payload);
        successCount++;
      } catch (err: any) {
        console.error("Error sending push in test-push:", err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          entry.subscription = null;
        }
      }
    }

    // Clean out null/expired subscriptions
    const sanitizedSubs = currentSubs.filter((e) => e.subscription !== null);
    if (sanitizedSubs.length !== currentSubs.length) {
      saveSubscriptions(sanitizedSubs);
    }

    res.json({ success: true, message: `Dispatched test notifications to ${successCount} devices.` });
  } catch (e: any) {
    console.error("Error in test-push endpoint:", e);
    res.status(500).json({ error: e.message });
  }
});

// BACKGROUND CHECK RUNNER EXPORT
export function checkRemindersAndPush() {
  const currentSubs = loadSubscriptions();
  const now = Date.now();
  let fileUpdated = false;

  currentSubs.forEach((entry) => {
    entry.reminders.forEach((r) => {
      if (!r.completed && !r.notified && r.dueTime) {
        const dueTimeMs = new Date(r.dueTime).getTime();
        // Trigger notification if due time has passed
        if (dueTimeMs <= now) {
          r.notified = true;
          fileUpdated = true;

          console.log(`[Push Notification Service] Sending Push: "${r.task}" to subscription at endpoint: ${entry.subscription.endpoint.slice(0, 45)}...`);

          webpush
            .sendNotification(
              entry.subscription,
              JSON.stringify({
                title: "SJ Tutor AI Reminder ⏰",
                body: r.task,
                url: "/?mode=notifications",
              })
            )
            .then(() => {
              console.log("[Push Notification Service] Notification successfully delivered.");
            })
            .catch((err) => {
              console.error("[Push Notification Service] Error sending notification. Clearing stale subscription if 410 Gone.", err);
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription is no longer valid, delete it later
                entry.subscription = null; 
              }
            });
        }
      }
    });
  });

  // Clean out null/expired subscriptions
  const sanitizedSubs = currentSubs.filter((e) => e.subscription !== null);
  if (sanitizedSubs.length !== currentSubs.length) {
    fileUpdated = true;
  }

  if (fileUpdated) {
    saveSubscriptions(sanitizedSubs);
  }
}

export default router;
