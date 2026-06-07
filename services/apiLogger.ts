import { ApiLogEntry } from "../types";

const MAX_LOG_SIZE = 50;
const SESSION_LOGS_KEY = "sjtutor_api_request_logs";

let localLogs: ApiLogEntry[] = [];

// Initialize logs from localStorage for persistence across reloads
try {
  const stored = localStorage.getItem(SESSION_LOGS_KEY);
  if (stored) {
    localLogs = JSON.parse(stored);
  }
} catch (e) {
  console.error("Failed to parse stored API request logs:", e);
}

export const ApiLogger = {
  getLogs(): ApiLogEntry[] {
    return localLogs;
  },

  log(
    endpoint: string,
    status: number,
    payload: any,
    errorMessage?: string
  ): ApiLogEntry {
    let errorType: ApiLogEntry["errorType"] = "success";

    if (status === 0 || (errorMessage && /fetch|network|offline|dns|cors/i.test(errorMessage))) {
      errorType = "network";
      status = status || 0;
    } else if (status === 429 || (errorMessage && /quota|rate limit|limit|exhausted/i.test(errorMessage))) {
      errorType = "quota";
    } else if (status >= 500 || (errorMessage && /server|internal|500/i.test(errorMessage))) {
      errorType = "server";
    } else if (status > 0 && status !== 200 && status !== 201) {
      errorType = "other";
    }

    const newEntry: ApiLogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      endpoint,
      payload: this.sanitizePayload(payload),
      status,
      errorType,
      errorMessage,
    };

    localLogs.unshift(newEntry);
    if (localLogs.length > MAX_LOG_SIZE) {
      localLogs = localLogs.slice(0, MAX_LOG_SIZE);
    }

    try {
      localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(localLogs));
    } catch (e) {
      console.warn("Storage quota exceeded for API logs, clearing older logs:", e);
    }

    // Dispatch global event for interactive diagnostic updates in UI
    window.dispatchEvent(new CustomEvent("sjtutor-api-log-added", { detail: newEntry }));

    return newEntry;
  },

  clearLogs(): void {
    localLogs = [];
    localStorage.removeItem(SESSION_LOGS_KEY);
    window.dispatchEvent(new CustomEvent("sjtutor-api-log-added"));
  },

  sanitizePayload(payload: any): any {
    if (!payload) return undefined;
    try {
      // Create a copy to sanitize sensitive fields
      const copy = JSON.parse(JSON.stringify(payload));
      const sensitiveKeys = ["apiKey", "password", "token", "imageBase64", "imagesBase64"];
      
      const sanitizeObject = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        for (const key in obj) {
          if (sensitiveKeys.includes(key)) {
            if (typeof obj[key] === "string" && obj[key].length > 40) {
              obj[key] = obj[key].substring(0, 10) + `... [TRUNCATED ${obj[key].length} chars]`;
            } else {
              obj[key] = "***REDACTED***";
            }
          } else if (typeof obj[key] === "object") {
            sanitizeObject(obj[key]);
          }
        }
      };

      sanitizeObject(copy);
      return copy;
    } catch {
      return "[Unserializable Payload]";
    }
  },
};
