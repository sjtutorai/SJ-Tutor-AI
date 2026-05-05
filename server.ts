import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./server/routes/auth";
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

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sjtutor";

console.log("-----------------------------------------");
console.log("SJTutor AI Server Initialization");
console.log("MONGO_URI defined:", !!process.env.MONGO_URI);
console.log(`Attempting to connect to MongoDB: ${MONGO_URI.replace(/:([^@]+)@/, ':****@')}`);
console.log("-----------------------------------------");

// Non-blocking connection attempt
mongoose.connect(MONGO_URI, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
})
  .then(() => console.log("✅ SJ Tutor AI: MongoDB Connected Successfully"))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
    if (MONGO_URI.includes("127.0.0.1")) {
      console.warn("Using local fallback - check if MONGO_URI is set in .env or environment variables");
    }
  });

// API routes
app.use("/api/auth", authRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
