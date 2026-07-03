import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./server/routes/auth";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const resolvedFilename = typeof __filename !== "undefined" ? __filename : fileURLToPath(import.meta.url);
const resolvedDirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(resolvedFilename);

// Load .env with override to ensure it takes precedence over system defaults
const envPath = path.resolve(resolvedDirname, ".env");
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
         const indexPath = path.resolve(resolvedDirname, "dist", "index.html");
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
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(resolvedDirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
