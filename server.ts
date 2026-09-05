import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./server/routes/auth";
import { pushNotificationService } from "./server/services/pushNotificationService";
import path from "path";
import fs from "fs";

// Load .env with override to ensure it takes precedence over system defaults
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath, override: true });

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Favicon and brand assets directly served with HTTP 200 and proper MIME headers
app.get('/favicon.ico', (req, res) => {
  const filePath = path.resolve(process.cwd(), "public", "favicon.ico");
  res.setHeader("Content-Type", "image/x-icon");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

app.get('/favicon-48x48.png', (req, res) => {
  const filePath = path.resolve(process.cwd(), "public", "favicon-48x48.png");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

app.get(['/favicon.png', '/favicon-32x32.png'], (req, res) => {
  const filePath = path.resolve(process.cwd(), "public", "favicon-32x32.png");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

app.get(['/apple-touch-icon.png', '/apple-touch-icon-180x180.png'], (req, res) => {
  const filePath = path.resolve(process.cwd(), "public", "apple-touch-icon.png");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
});

app.get(['/SJ-Tutor-AI-Logo.jpg', '/logo.jpg'], (req, res) => {
  const filePath = path.resolve(process.cwd(), "public", "SJ-Tutor-AI-Logo.jpg");
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.sendFile(filePath);
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

// Server-side Gemini multi-key rotation pool using GEMINI_API_KEY_1, GEMINI_API_KEY_2, and GEMINI_API_KEY_3
const getServerGeminiKeys = (): string[] => {
  const rawKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
  ];
  return Array.from(new Set(rawKeys.map(k => (k || '').trim()).filter(k => k.length > 5 && k !== 'undefined' && k !== 'null')));
};

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

Sitemap: https://sjtutorai.vercel.app/sitemap.xml`);
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
    <loc>https://sjtutorai.vercel.app/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sjtutorai.vercel.app/about</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sjtutorai.vercel.app/features</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://sjtutorai.vercel.app/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://sjtutorai.vercel.app/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://sjtutorai.vercel.app/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`);
  }
});

// API routes
app.use("/api/auth", authRoutes);

app.post("/api/generate-image", async (req, res, next) => {
  try {
    const { prompt, aspectRatio = "16:9" } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const seed = Math.floor(Math.random() * 1000000);
    const cleanPrompt = prompt.trim();
    let imageUrl = "";

    const keys = getServerGeminiKeys();
    for (const key of keys) {
      if (!key) continue;
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ 
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: `High quality digital background wallpaper: ${cleanPrompt}. Clean composition, wallpaper format, aesthetic lighting.` }]
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any || "16:9",
            }
          }
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (imageUrl) break;
      } catch (geminiErr: any) {
        console.warn(`[Server] Gemini Image generation attempt failed with key:`, geminiErr.message);
      }
    }

    // Dynamic real-time AI image synthesis via Pollinations AI if Gemini base64 isn't returned
    if (!imageUrl) {
      const encodedPrompt = encodeURIComponent(`${cleanPrompt}, high quality aesthetic wallpaper 4k hd`);
      imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1600&height=900&nologo=true&seed=${seed}&model=flux`;
    }

    res.json({ success: true, imageUrl, prompt: cleanPrompt });
  } catch (error: any) {
    next(error);
  }
});

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

    const keys = getServerGeminiKeys();
    if (keys.length === 0) {
      return res.status(500).json({ error: "GEMINI_API_KEY_1 or GEMINI_API_KEY_2 not configured on server" });
    }

    const { GoogleGenAI } = await import("@google/genai");

    const prompt = `Transcribe all spoken words in this audio recording accurately and faithfully. 
Preserve the speaker's language (primarily ${language} or any spoken language in the audio).
Return ONLY the raw transcription text with proper capitalization and punctuation. 
Do NOT include any timestamps, markdown labels, explanations, or quotes. 
If the audio is completely silent or contains no discernible speech, return an empty string.`;

    let transcript = "";
    let lastError: any = null;

    for (const key of keys) {
      if (!key) continue;
      try {
        const ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
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

        transcript = response.text?.trim() || "";
        break;
      } catch (transcribeErr: any) {
        lastError = transcribeErr;
        console.warn(`[Server Audio] Key error:`, transcribeErr.message);
      }
    }

    if (transcript !== "" || !lastError) {
      res.json({ success: true, transcript });
    } else {
      throw lastError || new Error("Failed to transcribe audio with all available keys");
    }
  } catch (error: any) {
    console.error("[Audio Transcription API Error]:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to transcribe audio" });
  }
});

// Background call decline endpoint from Service Worker
app.post("/api/calls/decline", async (req, res) => {
  try {
    const { callId } = req.body;
    console.log(`[CALL DECLINE API] Call declined remotely from Service Worker, callId: ${callId}`);
    res.json({ success: true, callId, status: "declined" });
  } catch (err: any) {
    console.error("[CALL DECLINE API Error]:", err);
    res.status(500).json({ success: false, error: err.message });
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
        <link rel="canonical" href="https://sjtutorai.vercel.app/quiz/${classSlug}/${subjectSlug}/${chapterSlug}">
      `;

      if (process.env.NODE_ENV !== "production") {
         next();
      } else {
         const indexPath = path.resolve(process.cwd(), "dist", "index.html");
         let html = await fs.promises.readFile(indexPath, 'utf-8');
         html = html.replace('<title>SJ Tutor AI - Your AI Study Buddy</title>', metaTags);
         res.send(html);
      }
    } catch (e) {
      next(e);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
