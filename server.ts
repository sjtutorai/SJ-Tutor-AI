import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./server/routes/auth";
import geminiRoutes from "./server/routes/gemini";
import pushRoutes, { checkRemindersAndPush } from "./server/routes/push";
import path from "path";
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
app.use("/api/gemini", geminiRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/notifications", pushRoutes);

// Global Error Handler
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
    
    // Poll reminders every 15 seconds to trigger Web Push even if website is closed
    setInterval(() => {
      try {
        checkRemindersAndPush();
      } catch (err) {
        console.error("Error in background checkRemindersAndPush:", err);
      }
    }, 15000);
  });
}

startServer();
