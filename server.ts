import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./server/routes/auth";
import { pushNotificationService } from "./server/services/pushNotificationService";
import { getFirebaseBackendStatus, verifyFirebaseUserWithBackend, checkFirebaseEmailWithBackend } from "./server/services/firebaseBackendService";
import path from "path";
import fs from "fs";

// Load .env with override to ensure it takes precedence over system defaults
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath, override: true });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Favicon and brand assets redirect directly to official JPEG logo link
app.get([
  '/favicon.ico',
  '/favicon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png',
  '/favicon-96x96.png',
  '/favicon-144x144.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-180x180.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/logo.png',
  '/og-image.png',
  '/images/sjtutor-logo.png'
], (req, res) => {
  res.redirect(302, 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg');
});

app.get(['/manifest.json', '/site.webmanifest'], (req, res) => {
  const filename = req.path.replace('/', '');
  const filePath = path.resolve(process.cwd(), "public", filename);
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

app.get('/sj_tutor_bg.jpg', (req, res) => {
  const filePath = path.resolve(process.cwd(), "public", "sj_tutor_bg.jpg");
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

app.get(['/SJ-Tutor-AI-Logo.jpg', '/logo.jpg'], (req, res) => {
  res.redirect(302, 'https://i.ibb.co/KpxwNSMS/SJ-Tutor-AI-Logo.jpg');
});

// Serve static public assets (favicons, logos, manifests, robots.txt, etc.)
app.use(express.static(path.resolve(process.cwd(), "public"), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
    }
  }
}));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Server-side Gemini multi-key rotation and intelligent high-demand failover manager
interface ServerKeySlot {
  id: string;
  key: string;
  masked: string;
  status: 'ACTIVE' | 'HIGH_DEMAND' | 'COOLING_DOWN';
  cooldownUntil: number;
  requests: number;
  highDemandCount: number;
}

class ServerGeminiKeyManager {
  private slots: ServerKeySlot[] = [];
  private currentIndex: number = 0;
  private readonly COOLDOWN_MS = 60000;

  constructor() {
    this.refresh();
  }

  public refresh(): ServerKeySlot[] {
    const rawDefinitions = [
      { id: "GEMINI_API_KEY_1", key: process.env.GEMINI_API_KEY_1 },
      { id: "GEMINI_API_KEY_2", key: process.env.GEMINI_API_KEY_2 },
      { id: "GEMINI_API_KEY_3", key: process.env.GEMINI_API_KEY_3 },
      { id: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY },
      { id: "API_KEY", key: process.env.API_KEY },
    ];

    const seen = new Set<string>();
    const newSlots: ServerKeySlot[] = [];

    for (const def of rawDefinitions) {
      const trimmed = (def.key || "").trim();
      if (trimmed.length > 5 && trimmed !== "undefined" && trimmed !== "null" && !seen.has(trimmed)) {
        seen.add(trimmed);
        const existing = this.slots.find((s) => s.key === trimmed);
        const masked = trimmed.length > 8 ? `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)}` : "***";
        newSlots.push({
          id: def.id,
          key: trimmed,
          masked,
          status: existing ? existing.status : 'ACTIVE',
          cooldownUntil: existing ? existing.cooldownUntil : 0,
          requests: existing ? existing.requests : 0,
          highDemandCount: existing ? existing.highDemandCount : 0,
        });
      }
    }
    this.slots = newSlots;
    return this.slots;
  }

  public isHighDemandError(err: any): boolean {
    if (!err) return false;
    const msg = String(err?.message || err?.statusText || err || "").toLowerCase();
    const status = err?.status || err?.statusCode;
    if (status === 429 || status === 503 || status === 500 || status === 502) return true;
    return (
      msg.includes("429") ||
      msg.includes("resource_exhausted") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("ratelimit") ||
      msg.includes("high demand") ||
      msg.includes("overloaded") ||
      msg.includes("capacity") ||
      msg.includes("too many requests") ||
      msg.includes("service unavailable") ||
      msg.includes("503") ||
      msg.includes("try again later")
    );
  }

  public getSlots(): ServerKeySlot[] {
    if (this.slots.length === 0) this.refresh();
    const now = Date.now();
    for (const s of this.slots) {
      if (s.cooldownUntil > 0 && now >= s.cooldownUntil) {
        s.status = 'ACTIVE';
        s.cooldownUntil = 0;
      }
    }
    return this.slots;
  }

  public getStatus() {
    const slots = this.getSlots();
    const active = slots[this.currentIndex % (slots.length || 1)];
    return {
      totalKeys: slots.length,
      activeKeyId: active?.id || "NONE",
      activeKeyMasked: active?.masked || "***",
      highDemandAutoSwitchEnabled: true,
      keys: slots.map((s) => ({
        id: s.id,
        masked: s.masked,
        status: s.status,
        requests: s.requests,
        highDemandCount: s.highDemandCount,
        inCooldown: s.cooldownUntil > Date.now(),
        cooldownRemainingSec: Math.max(0, Math.ceil((s.cooldownUntil - Date.now()) / 1000)),
      })),
    };
  }

  public async executeWithRotation<T>(operation: (key: string, slot: ServerKeySlot) => Promise<T>): Promise<T> {
    const slots = this.getSlots();
    if (slots.length === 0) {
      throw new Error("No valid Gemini API keys configured on server.");
    }

    const total = slots.length;
    const startIdx = this.currentIndex % total;
    this.currentIndex = (this.currentIndex + 1) % total;
    let lastErr: any = null;

    for (let i = 0; i < total; i++) {
      const idx = (startIdx + i) % total;
      const current = slots[idx];
      current.requests++;

      try {
        const result = await operation(current.key, current);
        current.status = 'ACTIVE';
        current.cooldownUntil = 0;
        return result;
      } catch (err: any) {
        lastErr = err;
        const highDemand = this.isHighDemandError(err);
        if (highDemand) {
          current.status = 'HIGH_DEMAND';
          current.highDemandCount++;
          current.cooldownUntil = Date.now() + this.COOLDOWN_MS;
          const nextSlot = slots[(idx + 1) % total];
          console.warn(`[Server Gemini Rotation] ⚠️ High demand on ${current.id} (${current.masked}). Automatically switching to ${nextSlot.id} (${nextSlot.masked})...`);
        } else {
          console.warn(`[Server Gemini Rotation] Error on ${current.id}: ${err.message || err}`);
        }

        if (i === total - 1) {
          throw lastErr;
        }
      }
    }
    throw lastErr || new Error("All Gemini keys failed on server.");
  }
}

const serverGeminiKeyManager = new ServerGeminiKeyManager();

// Gemini Key Status endpoint
app.get("/api/gemini/status", (req, res) => {
  res.json({ success: true, ...serverGeminiKeyManager.getStatus() });
});

// SEO Crawler endpoints
app.get("/robots.txt", (req, res) => {
  const robotsPath = path.resolve(process.cwd(), "public", "robots.txt");
  if (fs.existsSync(robotsPath)) {
    res.setHeader("Content-Type", "text/plain");
    res.sendFile(robotsPath);
  } else {
    res.setHeader("Content-Type", "text/plain");
    res.send(`User-agent: Googlebot
Allow: /
Allow: /favicon*
Allow: /logo*
Allow: /SJ-Tutor-AI-Logo.jpg
Allow: /og-image.png
Allow: /manifest.json

User-agent: Googlebot-Image
Allow: /
Allow: /favicon*
Allow: /logo*
Allow: /SJ-Tutor-AI-Logo.jpg
Allow: /og-image.png

User-agent: *
Allow: /
Allow: /favicon*
Allow: /logo*
Allow: /SJ-Tutor-AI-Logo.jpg
Allow: /og-image.png
Allow: /manifest.json

Disallow: /dashboard
Disallow: /api/
Disallow: /admin
Disallow: /profile
Disallow: /notes
Disallow: /quiz
Disallow: /chat
Disallow: /groups
Disallow: /notifications
Disallow: /history
Disallow: /auth

Sitemap: https://sj-tutorai.web.app/sitemap.xml`);
  }
});

app.get("/sitemap.xml", (req, res) => {
  const sitemapPath = path.resolve(process.cwd(), "public", "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    res.setHeader("Content-Type", "application/xml");
    res.sendFile(sitemapPath);
  } else {
    res.setHeader("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sj-tutorai.web.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sj-tutorai.web.app/about</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sj-tutorai.web.app/features</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sj-tutorai.web.app/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://sj-tutorai.web.app/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://sj-tutorai.web.app/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`);
  }
});

// API routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Firebase Backend Status & Hosting Information
app.get("/api/firebase/status", (_req, res) => {
  res.json(getFirebaseBackendStatus());
});

app.get("/api/firebase/hosting-info", (_req, res) => {
  const status = getFirebaseBackendStatus();
  res.json({
    site: status.hostingSite,
    url: status.hostingUrl,
    domains: status.hostingDomainAliases,
    projectId: status.projectId,
    status: "active"
  });
});

app.post("/api/firebase/verify-token", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "idToken is required" });
    }
    const result = await verifyFirebaseUserWithBackend(idToken);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

app.post("/api/firebase/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }
    const result = await checkFirebaseEmailWithBackend(email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

app.use("/api/auth", authRoutes);

// Push Notification Subscription Endpoints
app.get("/api/push/vapid-public-key", (req, res) => {
  try {
    const publicKey = pushNotificationService.getPublicKey();
    res.json({ success: true, publicKey });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/push/subscribe", (req, res) => {
  try {
    const { userId, subscription, userAgent } = req.body;
    if (!userId || !subscription) {
      return res.status(400).json({ success: false, error: "userId and subscription are required" });
    }
    const saved = pushNotificationService.saveSubscription(userId, subscription, userAgent);
    res.json({ success: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/push/unsubscribe", (req, res) => {
  try {
    const { endpoint, userId } = req.body;
    if (endpoint) {
      pushNotificationService.removeSubscription(endpoint, userId);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send general push notification
app.post("/api/notifications/push", async (req, res) => {
  try {
    const { targetUserId = "all", title, body, category, url } = req.body;
    const result = await pushNotificationService.sendGeneralPushNotification(targetUserId, {
      title,
      body,
      category,
      url,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Call notification dispatch endpoint
app.post("/api/calls/notify", async (req, res) => {
  try {
    const { callId, callerId, callerName, callerAvatar, receiverId, receiverName, type = "audio" } = req.body;
    console.log(`[CALL NOTIFY API] Incoming ${type} call from ${callerName} (${callerId}) to ${receiverName} (${receiverId}), callId: ${callId}`);

    // Trigger high-priority Web Push to receiver's background devices
    let pushResult = { sentCount: 0, failureCount: 0 };
    if (receiverId) {
      pushResult = await pushNotificationService.sendCallPushNotification(receiverId, {
        callId,
        callerId,
        callerName: callerName || "A Scholar",
        callerAvatar,
        type: type === "video" ? "video" : "audio",
      });
    }

    res.json({ 
      success: true, 
      callId, 
      sentCount: pushResult.sentCount,
      failureCount: pushResult.failureCount,
      message: "Call notification broadcasted successfully" 
    });
  } catch (err: any) {
    console.error("[CALL NOTIFY API Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Call decline endpoint (called from background Service Worker notification button)
app.post("/api/calls/decline", async (req, res) => {
  try {
    const { callId } = req.body;
    console.log(`[CALL DECLINE API] Call declined via background notification: ${callId}`);
    res.json({ success: true, callId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Call dismiss endpoint to clear active call notifications across devices
app.post("/api/calls/dismiss", async (req, res) => {
  try {
    const { callId, receiverId, callerId } = req.body;
    console.log(`[CALL DISMISS API] Call notification dismissed: ${callId} for receiver: ${receiverId}, caller: ${callerId}`);
    if (receiverId) {
      pushNotificationService.sendDismissCallPushNotification(receiverId, callId).catch(() => {});
    }
    if (callerId) {
      pushNotificationService.sendDismissCallPushNotification(callerId, callId).catch(() => {});
    }
    res.json({ success: true, callId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Audio Transcription Endpoint using Gemini AI
app.post("/api/transcribe-audio", async (req, res) => {
  try {
    const { audio, mimeType = "audio/webm", language = "English" } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "Audio data is required" });
    }

    let cleanBase64 = audio;
    let finalMimeType = mimeType;
    if (typeof audio === "string" && audio.startsWith("data:")) {
      const parts = audio.split(";base64,");
      if (parts.length === 2) {
        finalMimeType = parts[0].replace("data:", "");
        cleanBase64 = parts[1];
      }
    }

    const { GoogleGenAI } = await import("@google/genai");

    const prompt = `Transcribe all spoken words in this audio recording accurately and faithfully. 
Preserve the speaker's language (primarily ${language} or any spoken language in the audio).
Return ONLY the raw transcription text with proper capitalization and punctuation. 
Do NOT include any timestamps, markdown labels, explanations, or quotes. 
If the audio is completely silent or contains no discernible speech, return an empty string.`;

    const transcript = await serverGeminiKeyManager.executeWithRotation(async (key) => {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: finalMimeType || 'audio/webm',
              data: cleanBase64,
            }
          },
          {
            text: prompt
          }
        ]
      });

      return response.text?.trim() || "";
    });

    res.json({ success: true, transcript });
  } catch (error: any) {
    console.error("[Audio Transcription API Error]:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to transcribe audio" });
  }
});

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
  app.get("/quiz/:classSlug/:subjectSlug/:chapterSlug", async (req, res, next) => {
    try {
      const { classSlug, subjectSlug, chapterSlug } = req.params;
      
      const formatTitle = (s: string) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const chapterStr = formatTitle(chapterSlug);
      const classStr = formatTitle(classSlug);
      const subjectStr = formatTitle(subjectSlug);
      
      const title = `${chapterStr} Quiz | ${classStr} ${subjectStr} | SJ Tutor AI`;
      const desc = `📚 Test your knowledge with this quiz on ${chapterStr} (Class ${classStr}, ${subjectStr}) in SJ Tutor AI. Challenge yourself now!`;
      
      const metaTags = `
        <title>${title}</title>
        <meta name="description" content="${desc}">
        <meta property="og:title" content="📖 ${chapterStr} Quiz">
        <meta property="og:description" content="${classStr} ${subjectStr} Practice with SJ Tutor AI">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${desc}">
        <link rel="canonical" href="https://sj-tutorai.web.app/quiz/${classSlug}/${subjectSlug}/${chapterSlug}">
      `;

      if (process.env.NODE_ENV !== "production") {
         next();
      } else {
         const indexPath = path.resolve(process.cwd(), "dist", "index.html");
         let html = await fs.promises.readFile(indexPath, 'utf-8');
         html = html.replace(/<title>.*?<\/title>/i, metaTags);
         res.send(html);
      }
    } catch (e) {
      next(e);
    }
  });

  // Handle shared content routes with open graph tags and SPA entry fallback
  app.get(["/share/:shareId", "/shared/:shareId"], async (req, res, next) => {
    try {
      const { shareId } = req.params;
      const title = `Shared Study Material | SJ Tutor AI - Personalised AI Tutor for Students`;
      const desc = `Access interactive practice quizzes, comprehensive chapter summaries, and AI homework solutions on SJ Tutor AI.`;

      const metaTags = `
        <title>${title}</title>
        <meta name="description" content="${desc}">
        <meta property="og:title" content="🎓 ${title}">
        <meta property="og:description" content="${desc}">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${desc}">
        <link rel="canonical" href="https://sj-tutorai.web.app/share/${shareId}">
      `;

      if (process.env.NODE_ENV !== "production") {
        next();
      } else {
        const indexPath = path.resolve(process.cwd(), "dist", "index.html");
        if (fs.existsSync(indexPath)) {
          let html = await fs.promises.readFile(indexPath, 'utf-8');
          html = html.replace(/<title>.*?<\/title>/i, metaTags);
          res.send(html);
        } else {
          next();
        }
      }
    } catch (e) {
      next(e);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("{*path}", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
