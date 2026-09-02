import { GoogleGenAI } from "@google/genai";

/**
 * Gemini Multi-Key Rotation & High-Availability Manager
 * 
 * Manages 2-3 Gemini API Keys (GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3)
 * for rapid generation, concurrent throughput, and automatic quota/rate-limit failover.
 */

let currentKeyIndex = 0;

export const GeminiKeyManager = {
  /**
   * Retrieves all unique, non-empty Gemini API keys configured across
   * environment variables and configuration definitions.
   */
  getAvailableKeys: (): string[] => {
    const rawKeys: (string | undefined)[] = [
      typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined,
      typeof process !== 'undefined' ? process.env.GEMINI_API_KEY_2 : undefined,
      typeof process !== 'undefined' ? process.env.GEMINI_API_KEY_3 : undefined,
      typeof process !== 'undefined' ? process.env.GEMINI_API_KEY_1 : undefined,
      typeof process !== 'undefined' ? process.env.API_KEY : undefined,
    ];

    // Deduplicate and filter out empty or placeholder strings
    const validKeys = Array.from(
      new Set(
        rawKeys
          .filter((k): k is string => typeof k === 'string' && k.trim().length > 0 && !k.startsWith('YOUR_'))
          .map(k => k.trim())
      )
    );

    return validKeys;
  },

  /**
   * Returns the next API key in round-robin sequence to distribute requests evenly.
   */
  getNextApiKey: (): string => {
    const keys = GeminiKeyManager.getAvailableKeys();
    if (keys.length === 0) {
      throw new Error("GEMINI_API_KEY_MISSING: Please configure your GEMINI_API_KEY, GEMINI_API_KEY_2, or GEMINI_API_KEY_3 environment variables.");
    }
    const key = keys[currentKeyIndex % keys.length];
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    return key;
  },

  /**
   * Creates an initialized GoogleGenAI instance using a specific key or next rotating key.
   */
  getClient: (apiKey?: string): GoogleGenAI => {
    const selectedKey = apiKey || GeminiKeyManager.getNextApiKey();
    return new GoogleGenAI({ apiKey: selectedKey });
  },

  /**
   * Returns current pool stats (how many keys are active).
   */
  getPoolStats: () => {
    const keys = GeminiKeyManager.getAvailableKeys();
    return {
      activeKeyCount: keys.length,
      hasKeys: keys.length > 0,
      isMultiKeyEnabled: keys.length > 1,
    };
  },

  /**
   * Checks whether an error is due to quota exhaustion, rate limiting (429), or capacity limits.
   */
  isRateLimitError: (error: any): boolean => {
    if (!error) return false;
    const msg = (error.message || String(error)).toLowerCase();
    const status = error.status || error.statusCode || error.code;
    return (
      status === 429 ||
      status === 'quota_exceeded' ||
      status === 'RESOURCE_EXHAUSTED' ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('rate-limit') ||
      msg.includes('resource_exhausted') ||
      msg.includes('exceeded your current quota') ||
      msg.includes('too many requests') ||
      msg.includes('overloaded')
    );
  },

  /**
   * Executes an AI operation with round-robin key selection and automatic failover.
   * If Key 1 hits a rate limit or quota exceeded, it automatically fails over to Key 2, Key 3, etc.
   */
  executeWithRotation: async <T>(operation: (ai: GoogleGenAI, key: string, keyIndex: number) => Promise<T>): Promise<T> => {
    const keys = GeminiKeyManager.getAvailableKeys();
    if (keys.length === 0) {
      throw new Error("GEMINI_API_KEY_MISSING: Please configure your GEMINI_API_KEY, GEMINI_API_KEY_2, or GEMINI_API_KEY_3 environment variables.");
    }

    const startIndex = currentKeyIndex % keys.length;
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;

    let lastError: any = null;

    // Try all available keys starting from startIndex
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const activeIndex = (startIndex + attempt) % keys.length;
      const activeKey = keys[activeIndex];
      const ai = new GoogleGenAI({ apiKey: activeKey });

      try {
        return await operation(ai, activeKey, activeIndex);
      } catch (err: any) {
        lastError = err;
        if (GeminiKeyManager.isRateLimitError(err) && attempt < keys.length - 1) {
          console.warn(
            `[GeminiKeyManager] API Key #${activeIndex + 1} quota/rate limited. Auto-failing over to key #${((activeIndex + 1) % keys.length) + 1} of ${keys.length}...`
          );
          continue; // Try next key
        }
        // If not a rate limit error or we exhausted all keys, throw or re-throw
        if (!GeminiKeyManager.isRateLimitError(err)) {
          throw err;
        }
      }
    }

    throw lastError;
  },

  /**
   * Executes a streaming AI operation with key rotation and failover on stream initialization.
   */
  executeStreamWithRotation: async <T>(
    streamFactory: (ai: GoogleGenAI, key: string, keyIndex: number) => Promise<T>
  ): Promise<T> => {
    return GeminiKeyManager.executeWithRotation(streamFactory);
  }
};
