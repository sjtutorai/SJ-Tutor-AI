import { GoogleGenAI } from "@google/genai";

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

/**
 * Returns a server-side GoogleGenAI client with the required aistudio-build telemetry header.
 * Reads process.env.GEMINI_API_KEY (or GEMINI_API_KEY_1 / API_KEY fallbacks).
 */
export function getServerGeminiClient(explicitKey?: string): { ai: GoogleGenAI; key: string } {
  const activeKey =
    (explicitKey || "").trim() ||
    (process.env.GEMINI_API_KEY || "").trim() ||
    (process.env.GEMINI_API_KEY_1 || "").trim() ||
    (process.env.GEMINI_API_KEY_2 || "").trim() ||
    (process.env.GEMINI_API_KEY_3 || "").trim() ||
    (process.env.API_KEY || "").trim();

  if (!activeKey) {
    throw new Error("Missing GEMINI_API_KEY in server environment. Please configure your key in Settings > Secrets.");
  }

  if (cachedClient && cachedKey === activeKey) {
    return { ai: cachedClient, key: activeKey };
  }

  const ai = new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: {
      timeout: 45000,
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  cachedClient = ai;
  cachedKey = activeKey;
  return { ai, key: activeKey };
}

/**
 * Creates a freshly initialized client for a specific key (useful during key rotation).
 */
export function createDedicatedGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 45000,
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}
