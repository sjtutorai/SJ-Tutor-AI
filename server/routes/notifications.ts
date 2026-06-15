import express from "express";
import webPush from "web-push";
import fs from "fs";
import path from "path";

const router = express.Router();

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), "push_subscriptions.json");
const VAPID_KEYS_FILE = path.join(process.cwd(), "vapid_keys.json");

// Predefined notification lists provided by the user
export const PREDEFINED_NOTIFICATIONS = [
  {
    category: "Daily Study",
    icon: "📚",
    messages: [
      { title: "📚 Daily Study", body: "Ready for today's learning session?" },
      { title: "📚 Daily Study", body: "Study for 10 minutes and boost your knowledge!" },
      { title: "📚 Daily Study", body: "A little learning every day makes a big difference." },
      { title: "📚 Daily Study", body: "Your books are waiting for you." },
      { title: "📚 Daily Study", body: "Today's study goal is ready." }
    ]
  },
  {
    category: "Streak",
    icon: "🔥",
    messages: [
      { title: "🔥 Streak", "body": "Keep your streak alive today!" },
      { title: "🔥 Streak", "body": "You're doing great—don't break your streak." },
      { title: "🔥 Streak", "body": "Another day, another achievement." },
      { title: "🔥 Streak", "body": "Your learning streak needs one more study session." },
      { title: "🔥 Streak", "body": "Maintain your consistency and grow." }
    ]
  },
  {
    category: "Homework",
    icon: "📝",
    messages: [
      { title: "📝 Homework", "body": "Have you completed today's homework?" },
      { title: "📝 Homework", "body": "Need help with assignments? Ask SJ Tutor AI." },
      { title: "📝 Homework", "body": "Homework becomes easier with AI assistance." },
      { title: "📝 Homework", "body": "Finish your tasks before the deadline." },
      { title: "📝 Homework", "body": "Let's solve today's doubts together." }
    ]
  },
  {
    category: "Exams",
    icon: "🎯",
    messages: [
      { title: "🎯 Exams", "body": "Exam coming soon? Start revising now." },
      { title: "🎯 Exams", "body": "Revision time! Your exam is approaching." },
      { title: "🎯 Exams", "body": "Practice today, score better tomorrow." },
      { title: "🎯 Exams", "body": "One chapter revised is one step closer to success." },
      { title: "🎯 Exams", "body": "Smart preparation starts now." }
    ]
  },
  {
    category: "AI Features",
    icon: "🤖",
    messages: [
      { title: "🤖 AI Features", "body": "Ask any question and get an instant answer." },
      { title: "🤖 AI Features", "body": "Stuck on a problem? SJ Tutor AI can help." },
      { title: "🤖 AI Features", "body": "Generate study notes in seconds." },
      { title: "🤖 AI Features", "body": "Explore AI-powered learning tools." },
      { title: "🤖 AI Features", "body": "Learn smarter with personalized guidance." }
    ]
  },
  {
    category: "Quizzes",
    icon: "🧠",
    messages: [
      { title: "🧠 Quizzes", "body": "Take a quick quiz and test yourself." },
      { title: "🧠 Quizzes", "body": "Challenge yourself with today's quiz." },
      { title: "🧠 Quizzes", "body": "Ready to score 100%?" },
      { title: "🧠 Quizzes", "body": "Practice makes perfect—start a quiz now." },
      { title: "🧠 Quizzes", "body": "Strengthen your concepts with a quiz." }
    ]
  },
  {
    category: "Motivation",
    icon: "🌟",
    messages: [
      { title: "🌟 Motivation", "body": "Success starts with a single study session." },
      { title: "🌟 Motivation", "body": "Every expert was once a beginner." },
      { title: "🌟 Motivation", "body": "Small efforts create big achievements." },
      { title: "🌟 Motivation", "body": "Believe in yourself and keep learning." },
      { "title": "🌟 Motivation", "body": "Your future self will thank you." }
    ]
  },
  {
    category: "Updates",
    icon: "📢",
    messages: [
      { title: "📢 Updates", "body": "New features have arrived in SJ Tutor AI." },
      { title: "📢 Updates", "body": "Check out the latest improvements." },
      { title: "📢 Updates", "body": "Exciting updates are waiting for you." },
      { title: "📢 Updates", "body": "Discover what's new today." },
      { title: "📢 Updates", "body": "Your learning experience just got better." }
    ]
  },
  {
    category: "Re-engagement",
    icon: "👋",
    messages: [
      { title: "👋 Re-engagement", "body": "It's been a while. Ready to learn again?" },
      { title: "👋 Re-engagement", "body": "We miss seeing you in SJ Tutor AI." },
      { title: "👋 Re-engagement", "body": "Come back and continue your progress." },
      { title: "👋 Re-engagement", "body": "Your study journey is waiting." },
      { title: "👋 Re-engagement", "body": "Pick up where you left off." }
    ]
  },
  {
    category: "Achievements",
    icon: "🏆",
    messages: [
      { title: "🏆 Achievements", "body": "Congratulations on reaching a new milestone!" },
      { title: "🏆 Achievements", "body": "You're making excellent progress." },
      { title: "🏆 Achievements", "body": "Another achievement unlocked!" },
      { title: "🏆 Achievements", "body": "Keep up the amazing work." },
      { title: "🏆 Achievements", "body": "You're becoming a smarter learner every day." }
    ]
  },
  {
    category: "Special Notification",
    icon: "🚀",
    messages: [
      { title: "🚀 Special Notification", "body": "Good Morning! ☀️ What would you like to learn today with SJ Tutor AI?" }
    ]
  }
];

// Load or generate VAPID keys
let vapidKeys = { publicKey: "", privateKey: "" };

try {
  if (fs.existsSync(VAPID_KEYS_FILE)) {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, "utf-8"));
  } else {
    const keys = webPush.generateVAPIDKeys();
    vapidKeys = {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey
    };
    fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys, null, 2));
  }
} catch (e) {
  console.error("[Push Notifications] Error loading/generating VAPID keys:", e);
}

// Fallbacks if files failed
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const fallback = webPush.generateVAPIDKeys();
  vapidKeys = { publicKey: fallback.publicKey, privateKey: fallback.privateKey };
}

webPush.setVapidDetails(
  "mailto:sjtutorai@gmail.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Helper to read subscriptions
function getSubscriptions(): Array<any> {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("[Push Notifications] Error reading subscriptions:", e);
  }
  return [];
}

// Helper to save subscriptions
function saveSubscriptions(subs: Array<any>) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
  } catch (e) {
    console.error("[Push Notifications] Error saving subscriptions:", e);
  }
}

// 1. GET VAPID Public Key
router.get("/vapid-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// 2. POST Save Push Subscription
router.post("/subscribe", (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ message: "Subscription with endpoint is required." });
  }

  const currentSubs = getSubscriptions();
  // Filter out duplicate or matching endpoints
  const filtered = currentSubs.filter(sub => sub.subscription.endpoint !== subscription.endpoint);
  
  filtered.push({
    subscription,
    userId: userId || "guest",
    createdAt: Date.now()
  });

  saveSubscriptions(filtered);
  console.log(`[Push Notifications] Subscribed. Active count: ${filtered.length}`);
  res.json({ success: true, count: filtered.length });
});

// 3. POST Unsubscribe Push
router.post("/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ message: "Endpoint required." });
  }

  const currentSubs = getSubscriptions();
  const updated = currentSubs.filter(sub => sub.subscription.endpoint !== endpoint);
  saveSubscriptions(updated);
  res.json({ success: true, count: updated.length });
});

// 4. POST Trigger Test notification specifically
router.post("/trigger-test", async (req, res) => {
  const { title, body, category, delaySeconds } = req.body;
  const currentSubs = getSubscriptions();

  if (currentSubs.length === 0) {
    return res.status(400).json({ message: "No active device subscriptions found. Please enable background notifications first." });
  }

  const notificationPayload = JSON.stringify({
    title: title || "SJ Tutor AI Test",
    body: body || "This is a test notification!",
    category: category || "Important Alerts",
    timestamp: Date.now()
  });

  const sendPushPromise = async () => {
    let successCount = 0;
    let failedCount = 0;
    const updatedSubs = [...currentSubs];

    await Promise.allSettled(
      currentSubs.map(async (sub) => {
        try {
          await webPush.sendNotification(sub.subscription, notificationPayload);
          successCount++;
        } catch (err: any) {
          failedCount++;
          console.warn("[Push] Failed sending push to subscription:", sub.subscription.endpoint, err.message);
          // If the subscription is expired or unsubscribed, remove it
          if (err.statusCode === 410 || err.statusCode === 404) {
            const index = updatedSubs.findIndex(item => item.subscription.endpoint === sub.subscription.endpoint);
            if (index !== -1) updatedSubs.splice(index, 1);
          }
        }
      })
    );

    if (failedCount > 0) {
      saveSubscriptions(updatedSubs);
    }
    console.log(`[Push] Test transmission done. Success: ${successCount}. Failures: ${failedCount}.`);
  };

  if (delaySeconds && delaySeconds > 0) {
    setTimeout(sendPushPromise, delaySeconds * 1000);
    res.json({ success: true, message: `Notification scheduled to deliver in ${delaySeconds} seconds.` });
  } else {
    await sendPushPromise();
    res.json({ success: true, message: "Notification sent successfully." });
  }
});

// 5. GET Broadcast to all subscriptions (Trigger scheduled broadcast)
router.post("/broadcast", async (req, res) => {
  const { category, customTitle, customBody } = req.body;
  const currentSubs = getSubscriptions();

  if (currentSubs.length === 0) {
    return res.json({ success: false, message: "No subscribers found to broadcast to." });
  }

  let finalTitle = customTitle;
  let finalBody = customBody;

  if (!finalTitle || !finalBody) {
    // Pick appropriate predefined messages
    let messagesPool = PREDEFINED_NOTIFICATIONS.flatMap(c => c.messages);
    if (category) {
      const catObj = PREDEFINED_NOTIFICATIONS.find(c => c.category.toLowerCase() === category.toLowerCase());
      if (catObj) {
        messagesPool = catObj.messages;
      }
    }
    
    // Pick a random one
    const randomMsg = messagesPool[Math.floor(Math.random() * messagesPool.length)];
    finalTitle = randomMsg.title;
    finalBody = randomMsg.body;
  }

  const payload = JSON.stringify({
    title: finalTitle,
    body: finalBody,
    category: category || "Important Alerts",
    timestamp: Date.now()
  });

  const updatedSubs = [...currentSubs];
  let successCount = 0;
  let failCount = 0;

  await Promise.allSettled(
    currentSubs.map(async (sub) => {
      try {
        await webPush.sendNotification(sub.subscription, payload);
        successCount++;
      } catch (err: any) {
        failCount++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          const idx = updatedSubs.findIndex(item => item.subscription.endpoint === sub.subscription.endpoint);
          if (idx !== -1) updatedSubs.splice(idx, 1);
        }
      }
    })
  );

  if (failCount > 0) {
    saveSubscriptions(updatedSubs);
  }

  res.json({
    success: true,
    title: finalTitle,
    body: finalBody,
    deliveredTo: successCount,
    unsubscribed: failCount
  });
});

export default router;
