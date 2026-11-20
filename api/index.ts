import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "../server/routes/auth";
import geminiRoutes, { serverGeminiKeyManager } from "../server/routes/gemini";
import {
  getFirebaseBackendStatus,
  verifyFirebaseUserWithBackend,
  checkFirebaseEmailWithBackend,
} from "../server/services/firebaseBackendService";

dotenv.config();
serverGeminiKeyManager.refresh();

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(cors());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/firebase/status", (_req, res) => {
  res.json(getFirebaseBackendStatus());
});

app.post("/api/firebase/verify-token", async (req, res) => {
  try {
    const { idToken } = req.body || {};
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
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }
    const result = await checkFirebaseEmailWithBackend(email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

app.use(["/api/ai", "/api/gemini"], geminiRoutes);
app.use("/api/auth", authRoutes);

app.post("/api/transcribe-audio", async (req, res) => {
  try {
    const { audio, mimeType = "audio/webm", language = "English" } = req.body || {};
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

    const prompt = `Transcribe all spoken words in this audio recording accurately and faithfully. 
Preserve the speaker's language (primarily ${language} or any spoken language in the audio).
Return ONLY the raw transcription text with proper capitalization and punctuation. 
Do NOT include any timestamps, markdown labels, explanations, or quotes. 
If the audio is completely silent or contains no discernible speech, return an empty string.`;

    const transcript = await serverGeminiKeyManager.executeWithRotation(
      async (ai, modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType: finalMimeType || "audio/webm",
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        });

        return response.text?.trim() || "";
      },
      ["gemini-3.5-transcribe", "gemini-4-hydrogen", "gemini-3.1-flash-lite"]
    );

    res.json({ success: true, transcript });
  } catch (error: any) {
    console.error("[Audio Transcription API Error]:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to transcribe audio" });
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
  });
});

export default app;
