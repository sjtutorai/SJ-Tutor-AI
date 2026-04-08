import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./server/routes/auth";

import path from "path";
import { fileURLToPath } from "url";

// Load environment variables explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

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
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn("⚠️ Warning: MONGO_URI environment variable is not defined.");
  console.warn("⚠️ Database features (OTP, Sharing) will be disabled.");
} else {
  // Mask sensitive part of URI for logging
  const maskedUri = MONGO_URI.replace(/\/\/.*:.*@/, "//****:****@");
  console.log(`⏳ Attempting to connect to MongoDB: ${maskedUri}`);
  
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
    })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => {
      console.error("❌ MongoDB Connection Error:", err.message);
      if (err.message.includes("ECONNREFUSED") && err.message.includes("127.0.0.1")) {
        console.error("👉 Tip: It seems you're trying to connect to a local MongoDB, but it's not running.");
        console.error("👉 If you're using MongoDB Atlas, make sure your MONGO_URI is correctly set in .env");
      }
    });
}

// API routes
app.use("/api/auth", authRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
