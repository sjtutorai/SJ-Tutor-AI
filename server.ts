import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./server/routes/auth";
import notificationRoutes, { PREDEFINED_NOTIFICATIONS } from "./server/routes/notifications";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env with override to ensure it takes precedence over system defaults
const envPath = path.resolve(__dirname, ".env");
dotenv.config({ path: envPath, override: true });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);

// Background periodic notifier (Even when user isn't visiting)
// Runs every 4 hours to send a random study/streak reminder to active subscriptions
const FOUR_HOURS = 4 * 60 * 60 * 1000;
setInterval(async () => {
  console.log("[Scheduler] Initiating automatic background push notification broadcast...");
  try {
    const SUBSCRIPTIONS_FILE = path.join(process.cwd(), "push_subscriptions.json");
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const subs = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8"));
      if (subs.length > 0) {
        // Pick a random predefined category
        const categories = PREDEFINED_NOTIFICATIONS;
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const randomMsg = randomCat.messages[Math.floor(Math.random() * randomCat.messages.length)];

        console.log(`[Scheduler] Broadcasting background alert: "${randomMsg.title}" -> "${randomMsg.body}"`);
        const payload = JSON.stringify({
          title: randomMsg.title,
          body: randomMsg.body,
          category: randomCat.category,
          timestamp: Date.now()
        });

        const webPush = (await import("web-push")).default;
        const updatedSubs = [...subs];
        let hasChanges = false;

        for (const sub of subs) {
          try {
            await webPush.sendNotification(sub.subscription, payload);
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              const idx = updatedSubs.findIndex(item => item.subscription.endpoint === sub.subscription.endpoint);
              if (idx !== -1) {
                updatedSubs.splice(idx, 1);
                hasChanges = true;
              }
            }
          }
        }

        if (hasChanges) {
          fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(updatedSubs, null, 2));
        }
      }
    }
  } catch (error) {
    console.error("[Scheduler] Background broadcast failed:", error);
  }
}, FOUR_HOURS);

// Global Error Handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("❌ Global Error Handler:", err);
  res.status(500).json({ 
    message: "Internal Server Error", 
    error: err.message || "Unknown error" 
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
