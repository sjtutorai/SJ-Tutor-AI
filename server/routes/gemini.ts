import { Router, Request, Response } from "express";
import { Type, ThinkingLevel } from "@google/genai";
import { createDedicatedGeminiClient } from "../geminiClient";

const DEFAULT_GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-4-hydrogen"];

const SUPPORTED_INLINE_MIME_PREFIXES = ["image/", "audio/", "video/"];
const SUPPORTED_INLINE_MIME_EXACT = new Set(["application/pdf"]);

function buildLowLatencyThinkingConfig(model: string) {
  return model === "gemini-4-hydrogen"
    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    : {};
}

function normalizeMimeType(rawMime?: string): string {
  return String(rawMime || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function isSupportedInlineMime(mimeType: string): boolean {
  if (!mimeType) return false;
  if (SUPPORTED_INLINE_MIME_EXACT.has(mimeType)) return true;
  return SUPPORTED_INLINE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

function parseDataUrl(input: string, fallbackMime = "image/jpeg"): { mimeType: string; data: string } | null {
  if (typeof input !== "string" || !input.trim()) return null;
  const trimmed = input.trim();
  const matches = trimmed.match(/^data:([^;]+)(?:;[^,]*)?;base64,(.+)$/s);
  if (matches) {
    return {
      mimeType: normalizeMimeType(matches[1]) || fallbackMime,
      data: matches[2].trim(),
    };
  }
  return {
    mimeType: normalizeMimeType(fallbackMime) || "image/jpeg",
    data: trimmed,
  };
}

function decodeBase64TextSafely(base64: string, maxChars = 16000): string {
  try {
    const decoded = Buffer.from(base64, "base64").toString("utf-8").trim();
    return decoded.length > maxChars ? `${decoded.slice(0, maxChars)}\n...[truncated]` : decoded;
  } catch {
    return "";
  }
}

function buildSafeAttachmentParts(
  file: { name?: string; type?: string; dataUrl?: string; textContent?: string }
): { inlinePart?: { inlineData: { mimeType: string; data: string } }; textNote?: string } {
  const fileName = file.name || "attachment";
  if (file.textContent && typeof file.textContent === "string" && file.textContent.trim()) {
    return {
      textNote: `\n[Attached File: ${fileName}]\nType: ${file.type || "text/plain"}\nContent:\n${file.textContent.slice(0, 16000)}\n`,
    };
  }
  if (!file.dataUrl) return {};

  const parsed = parseDataUrl(file.dataUrl, file.type || "application/octet-stream");
  if (!parsed || !parsed.data) return {};

  if (isSupportedInlineMime(parsed.mimeType)) {
    return {
      inlinePart: {
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      },
    };
  }

  if (
    parsed.mimeType.startsWith("text/") ||
    parsed.mimeType === "application/json" ||
    parsed.mimeType === "application/xml" ||
    parsed.mimeType === "application/csv"
  ) {
    const text = decodeBase64TextSafely(parsed.data);
    if (text) {
      return {
        textNote: `\n[Attached File: ${fileName}]\nType: ${parsed.mimeType}\nContent:\n${text}\n`,
      };
    }
  }

  return {
    textNote: `\n[Attached File: ${fileName} (${parsed.mimeType || "unknown type"}) — binary format could not be read directly; rely on user description or ask user to paste text/screenshot if needed.]\n`,
  };
}

function safeParseJson<T>(raw: string): T {
  const trimmed = (raw || "").replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    throw new Error("AI returned an empty JSON response. Please try again.");
  }
  const cleaned = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1)) as T;
      } catch {
        // continue to object check
      }
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        // fall through to retryable error
      }
    }
    throw new Error("AI returned an invalid or incomplete JSON response. Please try again.");
  }
}

interface NormalizedQuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

function resolveCorrectAnswerIndex(
  rawIndex: unknown,
  options: string[]
): number | null {
  const optionsLength = options.length;
  if (typeof rawIndex === "number" && Number.isInteger(rawIndex)) {
    if (rawIndex >= 0 && rawIndex < optionsLength) return rawIndex;
    // Handle occasional 1-based index when model returns optionsLength (e.g. 4 for 4 options)
    if (rawIndex === optionsLength && optionsLength > 0) return optionsLength - 1;
    return null;
  }
  if (typeof rawIndex === "string") {
    const trimmed = rawIndex.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 10);
      if (parsed >= 0 && parsed < optionsLength) return parsed;
      if (parsed === optionsLength && optionsLength > 0) return optionsLength - 1;
      return null;
    }
    const letterMatch = trimmed.match(/^(?:option\s*)?([A-Za-z])(?:[.)])?$/i);
    if (letterMatch) {
      const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      return idx >= 0 && idx < optionsLength ? idx : null;
    }
    // Exact option text match fallback
    const lowerTarget = trimmed.toLowerCase();
    const matchedIdx = options.findIndex((o) => o.trim().toLowerCase() === lowerTarget);
    if (matchedIdx !== -1) return matchedIdx;
  }
  return null;
}

function validateAndNormalizeQuizQuestions(parsed: unknown, requestedCount: number): NormalizedQuizQuestion[] {
  const rawQuestions: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.questions)
    ? (parsed as any).questions
    : [];

  if (rawQuestions.length === 0) {
    throw new Error("Quiz generator returned an empty question list. Please try again.");
  }

  const validQuestions: NormalizedQuizQuestion[] = [];

  for (const q of rawQuestions) {
    if (!q || typeof q !== "object") continue;

    const questionText = typeof q.question === "string" ? q.question.trim() : "";
    if (!questionText) continue;

    if (!Array.isArray(q.options)) continue;
    const rawOptions = q.options.map((opt: unknown) =>
      typeof opt === "string" ? opt.trim() : String(opt ?? "").trim()
    );

    const nonEmptyWithOriginalIdx = rawOptions
      .map((text: string, originalIdx: number) => ({ text, originalIdx }))
      .filter((entry: { text: string; originalIdx: number }) => entry.text.length > 0);

    if (nonEmptyWithOriginalIdx.length < 2) continue;

    const rawResolvedIdx = resolveCorrectAnswerIndex(q.correctAnswerIndex, rawOptions);
    if (rawResolvedIdx === null) continue;

    const mappedIdx = nonEmptyWithOriginalIdx.findIndex(
      (entry: { text: string; originalIdx: number }) => entry.originalIdx === rawResolvedIdx
    );
    if (mappedIdx === -1) continue;

    const options = nonEmptyWithOriginalIdx.map((entry: { text: string }) => entry.text);
    const rawExplanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
    const explanation = rawExplanation || `Correct answer: ${options[mappedIdx]}`;

    validQuestions.push({
      question: questionText,
      options,
      correctAnswerIndex: mappedIdx,
      explanation,
    });
  }

  const minimumRequired = Math.min(requestedCount, Math.max(1, Math.ceil(requestedCount * 0.6)));
  if (validQuestions.length < minimumRequired) {
    throw new Error(
      `Quiz generator returned incomplete or malformed questions (${validQuestions.length}/${requestedCount} valid). Please try again.`
    );
  }

  return validQuestions.slice(0, requestedCount);
}

export function classifyGeminiHttpError(
  error: any,
  actionLabel = "AI request"
): { status: number; message: string } {
  const rawMsg = String(error?.message || error || "");
  const lower = rawMsg.toLowerCase();
  const explicitStatus = Number(error?.status || error?.statusCode || 0);

  if (lower.includes("timed out") || explicitStatus === 504) {
    return {
      status: 504,
      message: `${actionLabel} took too long to respond. Please click Retry.`,
    };
  }

  if (
    explicitStatus === 429 ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("generaterequestsperday")
  ) {
    const isFreeTierDaily =
      lower.includes("perday") ||
      lower.includes("per day") ||
      lower.includes("free_tier") ||
      lower.includes("free tier");
    return {
      status: 429,
      message: isFreeTierDaily
        ? "The free-tier Gemini API daily quota has been reached on the configured server keys. Please wait a moment and retry, or select a billing-enabled API key in Settings > Secrets for higher quota."
        : "The AI service is temporarily rate-limited due to high usage. Please wait a few seconds and click Retry.",
    };
  }

  if (
    explicitStatus === 503 ||
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable") ||
    lower.includes("service unavailable")
  ) {
    return {
      status: 503,
      message: "The AI model is currently experiencing temporary high demand. Please wait a moment and click Retry.",
    };
  }

  if (
    explicitStatus === 403 ||
    explicitStatus === 401 ||
    lower.includes("permission_denied") ||
    lower.includes("api key not valid") ||
    lower.includes("api_key_invalid") ||
    lower.includes("missing gemini_api_key") ||
    lower.includes("no valid gemini api keys")
  ) {
    return {
      status: 403,
      message: "Server Gemini API key could not be authorized. Please check your API key in Settings > Secrets.",
    };
  }

  if (
    explicitStatus === 400 ||
    lower.includes("invalid_argument") ||
    lower.includes("unsupported mime")
  ) {
    return {
      status: 400,
      message: `${actionLabel} received an unsupported input or attachment format. Please try again with plain text, PDF, or an image.`,
    };
  }

  if (
    lower.includes("invalid or incomplete json") ||
    lower.includes("incomplete or malformed questions") ||
    lower.includes("empty json") ||
    lower.includes("empty question list") ||
    lower.includes("empty response")
  ) {
    return {
      status: 502,
      message: `${actionLabel} received an incomplete response from AI. Please click Retry.`,
    };
  }

  return {
    status: 500,
    message: `${actionLabel} encountered a temporary AI server error. Please click Retry.`,
  };
}

function withAttemptTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function extractRetryDelaySeconds(err: any): number | null {
  const msg = String(err?.message || err || "");
  const secMatch = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (secMatch) {
    const parsed = parseInt(secMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const humanMatch = msg.match(/retry in\s+(?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (humanMatch) {
    const hours = humanMatch[1] ? parseInt(humanMatch[1], 10) : 0;
    const mins = humanMatch[2] ? parseInt(humanMatch[2], 10) : 0;
    const secs = humanMatch[3] ? Math.ceil(parseFloat(humanMatch[3])) : 0;
    return hours * 3600 + mins * 60 + secs;
  }
  return null;
}

export interface ServerKeySlot {
  id: string;
  key: string;
  masked: string;
  status: "ACTIVE" | "HIGH_DEMAND" | "COOLING_DOWN" | "INVALID";
  cooldownUntil: number;
  requests: number;
  highDemandCount: number;
}

interface PairCooldownEntry {
  until: number;
  reason: "DAILY_QUOTA" | "RATE_LIMIT" | "HIGH_DEMAND" | "TIMEOUT";
}

export class ServerGeminiKeyManager {
  private slots: ServerKeySlot[] = [];
  private currentIndex = 0;
  private pairCooldowns = new Map<string, PairCooldownEntry>();
  private modelCooldowns = new Map<string, number>();

  private readonly SHORT_COOLDOWN_MS = 45000;
  private readonly DAILY_QUOTA_COOLDOWN_MS = 10 * 60 * 1000; // 10 min (recovers promptly if billing/key changes)
  private readonly TIMEOUT_COOLDOWN_MS = 20000;
  private readonly INVALID_KEY_COOLDOWN_MS = 10 * 60 * 1000;

  constructor() {
    this.refresh();
  }

  private pairKey(slotId: string, model: string): string {
    return `${slotId}::${model}`;
  }

  public refresh(): ServerKeySlot[] {
    const rawDefinitions = [
      { id: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY },
      { id: "GEMINI_API_KEY_1", key: process.env.GEMINI_API_KEY_1 },
      { id: "GEMINI_API_KEY_2", key: process.env.GEMINI_API_KEY_2 },
      { id: "GEMINI_API_KEY_3", key: process.env.GEMINI_API_KEY_3 },
      { id: "API_KEY", key: process.env.API_KEY },
    ];

    const seen = new Set<string>();
    const newSlots: ServerKeySlot[] = [];

    for (const def of rawDefinitions) {
      const trimmed = (def.key || "").trim();
      if (trimmed.length > 5 && trimmed !== "undefined" && trimmed !== "null" && !seen.has(trimmed)) {
        seen.add(trimmed);
        const existing = this.slots.find((s) => s.key === trimmed);
        const masked =
          trimmed.length > 8 ? `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)}` : "***";
        newSlots.push({
          id: def.id,
          key: trimmed,
          masked,
          status: "ACTIVE",
          cooldownUntil: 0,
          requests: existing ? existing.requests : 0,
          highDemandCount: existing ? existing.highDemandCount : 0,
        });
      }
    }

    // Clear cooldown caches on explicit refresh so newly updated keys/billing work immediately
    this.pairCooldowns.clear();
    this.modelCooldowns.clear();
    this.slots = newSlots;
    return this.slots;
  }

  private classifyErrorKind(
    err: any
  ): "INVALID_KEY" | "MODEL_NOT_FOUND" | "DAILY_QUOTA" | "RATE_LIMIT" | "HIGH_DEMAND" | "TIMEOUT" | "BAD_REQUEST" | "OTHER" {
    if (!err) return "OTHER";
    const msg = String(err?.message || err?.statusText || err || "").toLowerCase();
    const status = Number(err?.status || err?.statusCode || 0);

    if (
      status === 401 ||
      status === 403 ||
      msg.includes("permission_denied") ||
      msg.includes("api_key_invalid") ||
      msg.includes("api key not valid")
    ) {
      return "INVALID_KEY";
    }
    if (status === 404 || msg.includes("not_found") || (msg.includes("model") && msg.includes("not found"))) {
      return "MODEL_NOT_FOUND";
    }
    if (msg.includes("timed out")) {
      return "TIMEOUT";
    }
    if (
      status === 429 ||
      msg.includes("429") ||
      msg.includes("resource_exhausted") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("too many requests")
    ) {
      const retrySecs = extractRetryDelaySeconds(err);
      if (
        msg.includes("perday") ||
        msg.includes("per day") ||
        msg.includes("free_tier_requests") ||
        (retrySecs !== null && retrySecs > 120)
      ) {
        return "DAILY_QUOTA";
      }
      return "RATE_LIMIT";
    }
    if (
      status === 503 ||
      status === 502 ||
      status === 500 ||
      msg.includes("503") ||
      msg.includes("unavailable") ||
      msg.includes("high demand") ||
      msg.includes("overloaded") ||
      msg.includes("capacity") ||
      msg.includes("service unavailable") ||
      msg.includes("try again later")
    ) {
      return "HIGH_DEMAND";
    }
    if (status === 400 || msg.includes("invalid_argument")) {
      return "BAD_REQUEST";
    }
    return "OTHER";
  }

  public getSlots(): ServerKeySlot[] {
    if (this.slots.length === 0) this.refresh();
    const now = Date.now();
    for (const s of this.slots) {
      if (s.cooldownUntil > 0 && now >= s.cooldownUntil) {
        s.status = "ACTIVE";
        s.cooldownUntil = 0;
      }
    }
    return this.slots;
  }

  public getStatus() {
    const slots = this.getSlots();
    const now = Date.now();
    const active = slots[this.currentIndex % (slots.length || 1)];

    const activePairCooldowns: Record<string, { reason: string; remainingSec: number }> = {};
    for (const [k, v] of this.pairCooldowns.entries()) {
      if (v.until > now) {
        activePairCooldowns[k] = {
          reason: v.reason,
          remainingSec: Math.ceil((v.until - now) / 1000),
        };
      }
    }

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
        inCooldown: s.cooldownUntil > now,
        cooldownRemainingSec: Math.max(0, Math.ceil((s.cooldownUntil - now) / 1000)),
      })),
      pairCooldowns: activePairCooldowns,
    };
  }

  private isPairCoolingDown(slotId: string, model: string, now: number): number {
    const modelUntil = this.modelCooldowns.get(model) || 0;
    const pairEntry = this.pairCooldowns.get(this.pairKey(slotId, model));
    const pairUntil = pairEntry ? pairEntry.until : 0;
    return Math.max(modelUntil, pairUntil) > now ? Math.max(modelUntil, pairUntil) : 0;
  }

  private buildCandidatePlan(preferredModels: string[]): { slot: ServerKeySlot; model: string }[] {
    const slots = this.getSlots();
    const now = Date.now();
    const totalSlots = slots.length;
    const startIdx = this.currentIndex % totalSlots;
    this.currentIndex = (this.currentIndex + 1) % totalSlots;

    const orderedSlots: ServerKeySlot[] = [];
    for (let i = 0; i < totalSlots; i++) {
      orderedSlots.push(slots[(startIdx + i) % totalSlots]);
    }

    const healthy: { slot: ServerKeySlot; model: string }[] = [];
    const cooling: { slot: ServerKeySlot; model: string; until: number }[] = [];

    for (const model of preferredModels) {
      for (const slot of orderedSlots) {
        if (slot.status === "INVALID" && slot.cooldownUntil > now) {
          continue;
        }
        const until = this.isPairCoolingDown(slot.id, model, now);
        if (until === 0) {
          healthy.push({ slot, model });
        } else {
          cooling.push({ slot, model, until });
        }
      }
    }

    if (healthy.length > 0) {
      return healthy;
    }

    // If every (slot, model) pair is cooling down, try up to 2 pairs with soonest expiry as a last-chance attempt
    cooling.sort((a, b) => a.until - b.until);
    return cooling.slice(0, Math.min(2, cooling.length)).map(({ slot, model }) => ({ slot, model }));
  }

  private recordAttemptFailure(
    slot: ServerKeySlot,
    model: string,
    err: any,
    highDemandHitsPerModel: Map<string, number>
  ): { skipModelNow: boolean; abortAll: boolean } {
    const now = Date.now();
    const kind = this.classifyErrorKind(err);

    if (kind === "INVALID_KEY") {
      slot.status = "INVALID";
      slot.cooldownUntil = now + this.INVALID_KEY_COOLDOWN_MS;
      return { skipModelNow: false, abortAll: false };
    }

    if (kind === "MODEL_NOT_FOUND") {
      this.modelCooldowns.set(model, now + this.DAILY_QUOTA_COOLDOWN_MS);
      return { skipModelNow: true, abortAll: false };
    }

    if (kind === "BAD_REQUEST") {
      // Prompt / MIME / schema issue won't be fixed by retrying another key on the same model
      return { skipModelNow: true, abortAll: false };
    }

    if (kind === "DAILY_QUOTA") {
      const retrySecs = extractRetryDelaySeconds(err);
      const cooldownMs = retrySecs
        ? Math.min(this.DAILY_QUOTA_COOLDOWN_MS, Math.max(this.SHORT_COOLDOWN_MS, retrySecs * 1000))
        : this.DAILY_QUOTA_COOLDOWN_MS;
      this.pairCooldowns.set(this.pairKey(slot.id, model), {
        until: now + cooldownMs,
        reason: "DAILY_QUOTA",
      });
      slot.highDemandCount++;
      return { skipModelNow: false, abortAll: false };
    }

    if (kind === "RATE_LIMIT") {
      this.pairCooldowns.set(this.pairKey(slot.id, model), {
        until: now + this.SHORT_COOLDOWN_MS,
        reason: "RATE_LIMIT",
      });
      slot.highDemandCount++;
      return { skipModelNow: false, abortAll: false };
    }

    if (kind === "HIGH_DEMAND") {
      this.pairCooldowns.set(this.pairKey(slot.id, model), {
        until: now + this.SHORT_COOLDOWN_MS,
        reason: "HIGH_DEMAND",
      });
      slot.highDemandCount++;
      const hits = (highDemandHitsPerModel.get(model) || 0) + 1;
      highDemandHitsPerModel.set(model, hits);
      // After 2 keys hit 503 on this model, cool down the model globally and switch immediately
      if (hits >= 2) {
        this.modelCooldowns.set(model, now + this.SHORT_COOLDOWN_MS);
        return { skipModelNow: true, abortAll: false };
      }
      return { skipModelNow: false, abortAll: false };
    }

    if (kind === "TIMEOUT") {
      this.pairCooldowns.set(this.pairKey(slot.id, model), {
        until: now + this.TIMEOUT_COOLDOWN_MS,
        reason: "TIMEOUT",
      });
      // Immediately move to fallback model on timeout instead of burning another 25s
      return { skipModelNow: true, abortAll: false };
    }

    return { skipModelNow: false, abortAll: false };
  }

  public async executeWithRotation<T>(
    operation: (ai: ReturnType<typeof createDedicatedGeminiClient>, model: string, slot: ServerKeySlot) => Promise<T>,
    modelsOverride?: string[],
    timeouts?: { attemptTimeoutMs?: number; overallDeadlineMs?: number }
  ): Promise<T> {
    const slots = this.getSlots();
    if (slots.length === 0) {
      throw new Error("No valid Gemini API keys configured on server.");
    }

    const preferredModels = modelsOverride && modelsOverride.length > 0 ? modelsOverride : DEFAULT_GEMINI_MODELS;
    const attemptTimeoutMs = timeouts?.attemptTimeoutMs ?? 30000;
    const overallDeadlineMs = timeouts?.overallDeadlineMs ?? 75000;
    const candidates = this.buildCandidatePlan(preferredModels);

    if (candidates.length === 0) {
      throw new Error("No valid Gemini API keys configured on server.");
    }

    let lastErr: any = null;
    const overallDeadline = Date.now() + overallDeadlineMs;
    const skippedModels = new Set<string>();
    const highDemandHitsPerModel = new Map<string, number>();

    for (let idx = 0; idx < candidates.length; idx++) {
      const { slot, model } = candidates[idx];
      if (skippedModels.has(model)) continue;

      const remainingMs = overallDeadline - Date.now();
      if (idx > 0 && remainingMs < 4000) {
        break;
      }

      slot.requests++;
      const startedAt = Date.now();
      const thisAttemptMs = Math.min(attemptTimeoutMs, Math.max(8000, remainingMs));

      try {
        const ai = createDedicatedGeminiClient(slot.key, thisAttemptMs + 5000);
        const result = await withAttemptTimeout(
          operation(ai, model, slot),
          thisAttemptMs,
          `Gemini ${model}`
        );
        slot.status = "ACTIVE";
        slot.cooldownUntil = 0;
        this.pairCooldowns.delete(this.pairKey(slot.id, model));
        return result;
      } catch (err: any) {
        lastErr = err;
        const elapsed = Date.now() - startedAt;
        console.warn(
          `[Server Gemini] Error (${elapsed}ms) on ${slot.id} (${slot.masked}) model ${model}: ${err?.message || err}`
        );

        const { skipModelNow, abortAll } = this.recordAttemptFailure(slot, model, err, highDemandHitsPerModel);
        if (skipModelNow) skippedModels.add(model);
        if (abortAll) break;
      }
    }

    throw lastErr || new Error("All Gemini keys and fallback models failed on server.");
  }

  /**
   * Opens a Gemini content stream and validates that the FIRST text chunk arrives before returning,
   * so 429/503/timeout failures during stream startup seamlessly rotate to the next healthy (key, model).
   */
  public async openVerifiedStreamWithRotation(
    streamBuilder: (ai: ReturnType<typeof createDedicatedGeminiClient>, model: string, slot: ServerKeySlot) => Promise<AsyncIterable<any>>,
    options?: {
      modelsOverride?: string[];
      firstChunkTimeoutMs?: number;
      overallDeadlineMs?: number;
      isAborted?: () => boolean;
    }
  ): Promise<{ firstText: string; iterator: AsyncIterator<any>; model: string }> {
    const slots = this.getSlots();
    if (slots.length === 0) {
      throw new Error("No valid Gemini API keys configured on server.");
    }

    const preferredModels =
      options?.modelsOverride && options.modelsOverride.length > 0
        ? options.modelsOverride
        : DEFAULT_GEMINI_MODELS;
    const firstChunkTimeoutMs = options?.firstChunkTimeoutMs ?? 30000;
    const overallDeadlineMs = options?.overallDeadlineMs ?? 75000;
    const candidates = this.buildCandidatePlan(preferredModels);

    if (candidates.length === 0) {
      throw new Error("No valid Gemini API keys configured on server.");
    }

    let lastErr: any = null;
    const overallDeadline = Date.now() + overallDeadlineMs;
    const skippedModels = new Set<string>();
    const highDemandHitsPerModel = new Map<string, number>();

    for (let idx = 0; idx < candidates.length; idx++) {
      if (options?.isAborted?.()) {
        throw new Error("Client disconnected");
      }

      const { slot, model } = candidates[idx];
      if (skippedModels.has(model)) continue;

      const remainingMs = overallDeadline - Date.now();
      if (idx > 0 && remainingMs < 5000) {
        break;
      }

      slot.requests++;
      const startedAt = Date.now();
      const thisAttemptMs = Math.min(firstChunkTimeoutMs, Math.max(10000, remainingMs));

      try {
        const ai = createDedicatedGeminiClient(slot.key, thisAttemptMs + 25000);
        const opened = await withAttemptTimeout(
          (async () => {
            const stream = await streamBuilder(ai, model, slot);
            const iterator = stream[Symbol.asyncIterator]();
            // Advance until we get the first non-empty text chunk (some initial chunks are thinking/metadata only)
            for (let step = await iterator.next(); !step.done; step = await iterator.next()) {
              const chunkText = step.value?.text || "";
              if (chunkText) {
                return { firstText: chunkText, iterator, model };
              }
            }
            throw new Error("AI returned an empty response stream.");
          })(),
          thisAttemptMs,
          `Gemini stream ${model}`
        );

        slot.status = "ACTIVE";
        slot.cooldownUntil = 0;
        this.pairCooldowns.delete(this.pairKey(slot.id, model));
        return opened;
      } catch (err: any) {
        lastErr = err;
        const elapsed = Date.now() - startedAt;
        console.warn(
          `[Server Gemini Stream] Error (${elapsed}ms) on ${slot.id} (${slot.masked}) model ${model}: ${err?.message || err}`
        );

        const { skipModelNow, abortAll } = this.recordAttemptFailure(slot, model, err, highDemandHitsPerModel);
        if (skipModelNow) skippedModels.add(model);
        if (abortAll) break;
      }
    }

    throw lastErr || new Error("Failed to start Gemini stream on server.");
  }
}

export const serverGeminiKeyManager = new ServerGeminiKeyManager();

/**
 * Shared SSE streaming pipeline with keep-alive heartbeats, disconnect handling,
 * verified first-chunk failover, and clean classified error events.
 */
async function pipeGeminiStreamToSSE(
  _req: Request,
  res: Response,
  actionLabel: string,
  streamBuilder: (ai: ReturnType<typeof createDedicatedGeminiClient>, model: string) => Promise<AsyncIterable<any>>
) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(": connected\n\n");

  let clientClosed = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      clientClosed = true;
    }
  });

  const keepAliveTimer = setInterval(() => {
    if (!clientClosed && !res.writableEnded) {
      res.write(": ping\n\n");
    }
  }, 8000);

  try {
    const { firstText, iterator } = await serverGeminiKeyManager.openVerifiedStreamWithRotation(
      (ai, model) => streamBuilder(ai, model),
      {
        firstChunkTimeoutMs: 30000,
        overallDeadlineMs: 75000,
        isAborted: () => clientClosed || res.writableEnded,
      }
    );

    if (clientClosed || res.writableEnded) return;

    res.write(`data: ${JSON.stringify({ text: firstText })}\n\n`);

    while (!clientClosed && !res.writableEnded) {
      const step = await iterator.next();
      if (step.done) break;
      const text = step.value?.text || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    if (!clientClosed && !res.writableEnded) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error: any) {
    if (clientClosed || res.writableEnded) return;
    console.error(`[Server ${actionLabel} Error]:`, error);
    const classified = classifyGeminiHttpError(error, actionLabel);
    res.write(`data: ${JSON.stringify({ error: classified.message })}\n\n`);
    res.end();
  } finally {
    clearInterval(keepAliveTimer);
  }
}

const router = Router();

// 1. Status & Refresh
router.get("/status", (_req, res) => {
  res.json({ success: true, ...serverGeminiKeyManager.getStatus() });
});

router.post("/refresh", (_req, res) => {
  serverGeminiKeyManager.refresh();
  res.json({ success: true, ...serverGeminiKeyManager.getStatus() });
});

// 2. Note AI processing (summarize, simplify, mcq, translate)
router.post("/note-ai", async (req, res) => {
  try {
    const { content, task, language = "English" } = req.body || {};
    if (!content) return res.status(400).json({ success: false, error: "Note content is required." });

    const taskPrompts: Record<string, string> = {
      summarize: `Create a bulleted 'Revision Box' summary for the following note in ${language}. Focus on key definitions and dates.`,
      simplify: `Rewrite this note in very simple ${language} so a younger student can understand it perfectly.`,
      mcq: `Generate 5 high-quality Multiple Choice Questions with answers in ${language} based ONLY on this note content. Return as Markdown list.`,
      translate: `Translate this note professionally into ${language}, maintaining academic terminology where appropriate.`,
    };

    const promptText = `${taskPrompts[task] || taskPrompts.summarize}\n\nNOTE CONTENT:\n${content}`;

    const text = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: promptText,
        config: {
          ...buildLowLatencyThinkingConfig(model),
          systemInstruction: `You are an AI study assistant. You must communicate and generate content strictly in ${language}.`,
        },
      });
      const out = response.text?.trim() || "";
      if (!out) throw new Error("AI returned an empty response.");
      return out;
    });

    res.json({ success: true, text });
  } catch (error: any) {
    console.error("[Server Note AI Error]:", error);
    const classified = classifyGeminiHttpError(error, "Note AI");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 3. Note structural template
router.post("/note-template", async (req, res) => {
  try {
    const { subject, chapter, templateType, language = "English" } = req.body || {};
    const prompt = `
      Create a highly structured academic template for a study note in ${language}.
      Subject: ${subject}
      Chapter: ${chapter}
      Template Type: ${templateType}

      Requirements:
      - Use Markdown headings (# , ##).
      - Include placeholders like [WRITE HERE].
      - For "Formula Sheet", use a table format.
      - For "Q&A", list 5 most important questions for this chapter based on standard board exams (CBSE/ICSE).
      - Include a "Key Points" and "Summary" section.
      - ALL TEXT MUST BE IN ${String(language).toUpperCase()}.
    `;

    const text = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          ...buildLowLatencyThinkingConfig(model),
        },
      });
      const out = response.text?.trim() || "";
      if (!out) throw new Error("AI returned an empty response.");
      return out;
    });

    res.json({ success: true, text });
  } catch (error: any) {
    console.error("[Server Note Template Error]:", error);
    const classified = classifyGeminiHttpError(error, "Note template generation");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 4. Generate AI Syllabus Notes
router.post("/ai-notes", async (req, res) => {
  try {
    const {
      classGrade,
      board,
      subject,
      language = "English",
      chapterName,
      author,
      maxCharacters = 4000,
      difficulty = "Medium",
    } = req.body || {};

    const systemInstruction = `You are SJ Tutor AI Notes Generator, an expert AI teacher that creates high-quality, syllabus-aligned notes for students.`;
    const prompt = `
Generate notes based on:
* Class: **${classGrade}**
* Board: **${board}**
* Subject: **${subject}**
* Language: **${language}**
* Chapter: **${chapterName}**
* Author/Poet: **${author || "None"}** (Optional)
* Maximum Characters: **${maxCharacters}**
* Depth / Difficulty Level: **${difficulty}**

### Requirements
1. Follow the syllabus of **${board}** for **Class ${classGrade}**.
2. Write entirely in the selected language: ${language}.
3. Never exceed the specified character limit: ${maxCharacters} characters.
4. Keep the notes simple, student-friendly, and exam-oriented with ${difficulty} depth.
5. Use clear Markdown headings.
6. Include only relevant information.
7. If an author/poet is provided, include a brief introduction.
8. Highlight important terms using **bold**.
9. Add examples wherever applicable.
10. Include formulas, dates, definitions, or equations when relevant.
11. Explain concepts step by step.
12. Describe diagrams in text if useful.
13. Finish with a **Quick Revision Summary**.

---

## Output Format

# ${chapterName}
## Overview
## Key Concepts
## Important Definitions
## Detailed Explanation
## Important Points
## Examples (if applicable)
## Formulas / Dates / Equations (if applicable)
## Quick Revision Summary
`;

    const text = await serverGeminiKeyManager.executeWithRotation(
      async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildLowLatencyThinkingConfig(model),
            systemInstruction,
          },
        });
        const out = response.text?.trim() || "";
        if (!out) throw new Error("AI returned an empty response.");
        return out;
      },
      undefined,
      { attemptTimeoutMs: 35000, overallDeadlineMs: 75000 }
    );

    res.json({ success: true, text });
  } catch (error: any) {
    console.error("[Server AI Notes Error]:", error);
    const classified = classifyGeminiHttpError(error, "AI Notes generation");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 5. Generate Quiz
router.post("/quiz", async (req, res) => {
  try {
    const { data } = req.body || {};
    if (!data || typeof data !== "object") {
      return res.status(400).json({ success: false, error: "Quiz request data is required." });
    }

    const subject = typeof data.subject === "string" ? data.subject.trim() : "";
    const chapterName = typeof data.chapterName === "string" ? data.chapterName.trim() : "";
    const gradeClass =
      typeof (data.gradeClass || data.grade) === "string" && (data.gradeClass || data.grade).trim()
        ? (data.gradeClass || data.grade).trim()
        : "General";
    const board = typeof data.board === "string" && data.board.trim() ? data.board.trim() : "CBSE";
    const language = typeof data.language === "string" && data.language.trim() ? data.language.trim() : "English";
    const difficulty =
      data.difficulty === "Easy" || data.difficulty === "Medium" || data.difficulty === "Hard"
        ? data.difficulty
        : "Medium";

    const rawCount =
      data.questionCount === undefined || data.questionCount === null || data.questionCount === ""
        ? 5
        : Number(data.questionCount);

    if (!subject) {
      return res.status(400).json({ success: false, error: "Subject is required to generate a quiz." });
    }
    if (!chapterName) {
      return res.status(400).json({ success: false, error: "Chapter or topic name is required to generate a quiz." });
    }
    if (!Number.isFinite(rawCount) || !Number.isInteger(rawCount) || rawCount < 1 || rawCount > 50) {
      return res.status(400).json({
        success: false,
        error: "Question count must be a whole number between 1 and 50.",
      });
    }

    const count = rawCount;
    const authorLine =
      typeof data.author === "string" && data.author.trim()
        ? `\n      Author/Textbook Reference: ${data.author.trim()}`
        : "";

    const prompt = `
      Create an academic multiple-choice quiz with EXACTLY ${count} questions based on the details below.
      EVERYTHING INCLUDING QUESTIONS, OPTIONS, AND EXPLANATIONS MUST BE WRITTEN STRICTLY IN ${language.toUpperCase()}.

      Requirements:
      - Difficulty level: ${difficulty} (appropriate for ${gradeClass} under ${board}).
      - Return a valid JSON array of EXACTLY ${count} question objects.
      - Each question MUST have 4 distinct, non-empty options in the "options" array.
      - "correctAnswerIndex" MUST be the zero-based integer index (0, 1, 2, or 3) of the single correct option.
      - Randomize the position of the correct answer across questions (do not always put the answer at index 0).
      - "explanation" MUST clearly and concisely explain why the correct option is right.

      Subject: ${subject}
      Chapter: ${chapterName}
      Class: ${gradeClass}
      Board: ${board}
      Language: ${language}${authorLine}
    `;

    const isNonEnglish = language.toLowerCase() !== "english";
    const attemptTimeoutMs = count >= 25 ? 45000 : count >= 10 || isNonEnglish ? 35000 : 25000;
    const overallDeadlineMs = count >= 25 ? 85000 : 75000;

    const questions = await serverGeminiKeyManager.executeWithRotation(
      async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildLowLatencyThinkingConfig(model),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"],
              },
            },
          },
        });

        if (!response.text || !response.text.trim()) {
          throw new Error("AI returned an empty JSON response. Please try again.");
        }

        const parsed = safeParseJson<any>(response.text);
        return validateAndNormalizeQuizQuestions(parsed, count);
      },
      undefined,
      { attemptTimeoutMs, overallDeadlineMs }
    );

    res.json({ success: true, questions });
  } catch (error: any) {
    console.error("[Server Quiz Error]:", error);
    const classified = classifyGeminiHttpError(error, "Quiz generation");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 6. Generate Study Timetable
router.post("/timetable", async (req, res) => {
  try {
    const { examDate, subjects, hoursPerDay, language = "English" } = req.body || {};
    const today = new Date().toDateString();
    const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;

    const timetable = await serverGeminiKeyManager.executeWithRotation(
      async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildLowLatencyThinkingConfig(model),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  date: { type: Type.STRING },
                  slots: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        time: { type: Type.STRING },
                        activity: { type: Type.STRING },
                        subject: { type: Type.STRING },
                      },
                      required: ["time", "activity", "subject"],
                    },
                  },
                },
                required: ["day", "date", "slots"],
              },
            },
          },
        });
        if (response.text) return safeParseJson<any[]>(response.text);
        throw new Error("AI returned an empty JSON response.");
      },
      undefined,
      { attemptTimeoutMs: 35000, overallDeadlineMs: 75000 }
    );

    res.json({ success: true, timetable });
  } catch (error: any) {
    console.error("[Server Timetable Error]:", error);
    const classified = classifyGeminiHttpError(error, "Timetable generation");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 7. Update Study Timetable
router.post("/timetable/update", async (req, res) => {
  try {
    const { currentTimetable, instruction, language = "English" } = req.body || {};
    const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;

    const timetable = await serverGeminiKeyManager.executeWithRotation(
      async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildLowLatencyThinkingConfig(model),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  date: { type: Type.STRING },
                  slots: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        time: { type: Type.STRING },
                        activity: { type: Type.STRING },
                        subject: { type: Type.STRING },
                      },
                      required: ["time", "activity", "subject"],
                    },
                  },
                },
                required: ["day", "date", "slots"],
              },
            },
          },
        });
        if (response.text) return safeParseJson<any[]>(response.text);
        throw new Error("AI returned an empty JSON response.");
      },
      undefined,
      { attemptTimeoutMs: 35000, overallDeadlineMs: 75000 }
    );

    res.json({ success: true, timetable });
  } catch (error: any) {
    console.error("[Server Timetable Update Error]:", error);
    const classified = classifyGeminiHttpError(error, "Timetable update");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 8. Chat With Tutor (Non-streaming)
router.post("/tutor-chat", async (req, res) => {
  try {
    const { text, history = [], imagesBase64 = [], systemInstruction } = req.body || {};

    const currentParts: any[] = [{ text: (text || "").trim() || "Hello" }];
    if (Array.isArray(imagesBase64)) {
      imagesBase64.forEach((img: string) => {
        const parsed = parseDataUrl(img, "image/jpeg");
        if (parsed && isSupportedInlineMime(parsed.mimeType)) {
          currentParts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
        }
      });
    }

    const cleanHistory: { role: string; parts: any[] }[] = [];
    for (const msg of Array.isArray(history) ? history : []) {
      if (!msg) continue;
      const parts: any[] = [];
      if (msg.images && Array.isArray(msg.images)) {
        msg.images.forEach((img: string) => {
          const parsed = parseDataUrl(img, "image/jpeg");
          if (parsed && isSupportedInlineMime(parsed.mimeType)) {
            parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
          }
        });
      }
      if (msg.text && typeof msg.text === "string" && msg.text.trim()) {
        parts.push({ text: msg.text.trim() });
      }
      if (parts.length > 0) {
        cleanHistory.push({
          role: msg.role === "model" ? "model" : "user",
          parts,
        });
      }
    }

    const firstUserIdx = cleanHistory.findIndex((m) => m.role === "user");
    const validHistory = firstUserIdx >= 0 ? cleanHistory.slice(firstUserIdx) : [];

    const alternatingHistory: { role: string; parts: any[] }[] = [];
    for (const turn of validHistory) {
      if (alternatingHistory.length > 0 && alternatingHistory[alternatingHistory.length - 1].role === turn.role) {
        alternatingHistory[alternatingHistory.length - 1].parts.push(...turn.parts);
      } else {
        alternatingHistory.push({ role: turn.role, parts: [...turn.parts] });
      }
    }

    if (alternatingHistory.length > 0 && alternatingHistory[alternatingHistory.length - 1].role === "user") {
      alternatingHistory.pop();
    }

    const reply = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: [...alternatingHistory, { role: "user", parts: currentParts }],
        config: {
          ...buildLowLatencyThinkingConfig(model),
          systemInstruction,
        },
      });
      const out = response.text?.trim() || "";
      if (!out) throw new Error("AI returned an empty response.");
      return out;
    });

    res.json({ success: true, text: reply });
  } catch (error: any) {
    console.error("[Server Tutor Chat Error]:", error);
    const classified = classifyGeminiHttpError(error, "Tutor chat");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 9. Streaming endpoints (Summary, Homework, Tutor Chat) using Server-Sent Events (SSE)
router.post("/summary-stream", async (req, res) => {
  const { data, systemInstruction } = req.body || {};
  if (!data) {
    return res.status(400).json({ success: false, error: "Study request data is required." });
  }

  const language = data.language || "English";
  const maxChars = data.maxCharacters || 5000;
  const difficulty = data.difficulty || "Medium";

  const prompt = `
      Create a comprehensive, syllabus-aligned, and structured study notes & summary for the following:
      THE ENTIRE NOTES/SUMMARY MUST BE WRITTEN IN ${String(language).toUpperCase()}.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || data.grade || "General"}
      Education Board: ${data.board}
      Language: ${language}
      Chapter/Topic: ${data.chapterName}
      ${data.author ? `Author/Poet: ${data.author}` : ""}
      Depth & Difficulty Level: ${difficulty}
      Target Character Limit: Approximately ${maxChars} characters (do not exceed ${maxChars + 500} characters).

      Please format the study notes cleanly with Markdown:
      # ${data.chapterName}
      ## Overview
      ## Key Concepts & Theory
      ## Important Definitions & Formulas
      ## Step-by-Step Explanations & Examples
      ## Quick Revision Summary & Key Takeaways
    `;

  await pipeGeminiStreamToSSE(req, res, "Summary generation", (ai, model) =>
    ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        ...buildLowLatencyThinkingConfig(model),
        systemInstruction:
          systemInstruction ||
          `You are an expert academic tutor and notes creator. You generate high quality, structured syllabus-aligned notes only in ${language}.`,
      },
    })
  );
});

router.post("/homework-stream", async (req, res) => {
  const { data, files = [], systemInstruction } = req.body || {};
  if (!data) {
    return res.status(400).json({ success: false, error: "Homework request data is required." });
  }

  const language = data.language || "English";
  const safeFiles = Array.isArray(files) ? files : [];

  let extraFileText = "";
  const inlineParts: any[] = [];
  for (const file of safeFiles) {
    const built = buildSafeAttachmentParts(file || {});
    if (built.inlinePart) inlineParts.push(built.inlinePart);
    if (built.textNote) extraFileText += built.textNote;
  }

  const prompt = `
      You are an expert Homework Solver and Academic Tutor.
      
      User Information:
      - Subject: ${data.subject}
      - Class/Grade: ${data.gradeClass || data.grade || "General"}
      - Board: ${data.board}
      - Language: ${language}
      - Chapter/Topic: ${data.chapterName}

      Input:
      ${data.homeworkQuery ? `Text Question/Description: "${data.homeworkQuery}"` : "No text description provided."}
      ${safeFiles.length > 0 ? `Files/Images Attached: I have attached ${safeFiles.length} file(s)/document(s)/image(s) of the homework/problem.` : "No files provided."}
      ${extraFileText}
      
      Requirements:
      - Carefully analyze ALL inputs (text, images, and documents).
      - If files are provided (such as PDFs, photos, DOCS, SHEETS, or TEXT files), extract the questions, data, or problems from them.
      - Provide a clear, step-by-step solution for all identified problems.
      - Explain the underlying concepts simply so the student can learn, not just copy.
      - THE ENTIRE RESPONSE MUST BE IN ${String(language).toUpperCase()}.
      
      If the inputs are unclear or do not contain educational problems, politely ask the student for more details or clearer files.
    `;

  const contents = [{ text: prompt }, ...inlineParts];

  await pipeGeminiStreamToSSE(req, res, "Homework solver", (ai, model) =>
    ai.models.generateContentStream({
      model,
      contents: { parts: contents },
      config: {
        ...buildLowLatencyThinkingConfig(model),
        systemInstruction:
          systemInstruction ||
          `You are an expert Homework Solver and Academic Tutor. You generate content only in ${language}.`,
      },
    })
  );
});

router.post("/tutor-stream", async (req, res) => {
  const { text, history = [], imagesBase64 = [], extraFiles = [], userContext, systemInstruction } = req.body || {};

  const fullInstruction =
    (systemInstruction ||
      `You are SJ Tutor AI, an advanced, highly intelligent, friendly, and motivational AI tutor and assistant.
Your mission:
- Help students learn concepts deeply rather than just giving answers.
- Explain math/science/coding/humanities step-by-step.
- Show examples and real-life connections.
- Keep your tone positive, encouraging, patient, curious, and professional.
- Render beautiful Markdown with clear headings, subheadings, lists, code blocks with copy buttons, horizontal lines, tables, block quotes, and LaTeX math.`) +
    (userContext ? `\n\nUser Context & Memory (Past Interactions):\n\n${userContext}` : "");

  const currentParts: any[] = [];
  let fileContext = "";

  if (Array.isArray(extraFiles)) {
    for (const f of extraFiles) {
      const built = buildSafeAttachmentParts(f || {});
      if (built.inlinePart) currentParts.push(built.inlinePart);
      if (built.textNote) fileContext += built.textNote;
    }
  }

  if (Array.isArray(imagesBase64)) {
    const alreadyInlineData = new Set(currentParts.map((p) => p?.inlineData?.data).filter(Boolean));
    for (const img of imagesBase64) {
      const parsed = parseDataUrl(img, "image/jpeg");
      if (parsed && isSupportedInlineMime(parsed.mimeType) && !alreadyInlineData.has(parsed.data)) {
        alreadyInlineData.add(parsed.data);
        currentParts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
      }
    }
  }

  let finalPrompt = text ? String(text).trim() : "";
  if (fileContext) {
    finalPrompt = `${fileContext}\n\nUser Question:\n${finalPrompt}`;
  }
  if (!finalPrompt) {
    finalPrompt = "Please examine and explain the attached image/file step-by-step.";
  }
  currentParts.push({ text: finalPrompt });

  const cleanHistory: { role: string; parts: any[] }[] = [];
  for (const msg of Array.isArray(history) ? history : []) {
    if (!msg) continue;
    const parts: any[] = [];
    if (msg.images && Array.isArray(msg.images)) {
      msg.images.forEach((img: string) => {
        const parsed = parseDataUrl(img, "image/jpeg");
        if (parsed && isSupportedInlineMime(parsed.mimeType)) {
          parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
        }
      });
    }
    if (msg.text && typeof msg.text === "string" && msg.text.trim()) {
      parts.push({ text: msg.text.trim() });
    }
    if (parts.length > 0) {
      cleanHistory.push({
        role: msg.role === "model" ? "model" : "user",
        parts,
      });
    }
  }

  const firstUserIdx = cleanHistory.findIndex((m) => m.role === "user");
  const validHistory = firstUserIdx >= 0 ? cleanHistory.slice(firstUserIdx) : [];

  const alternatingHistory: { role: string; parts: any[] }[] = [];
  for (const turn of validHistory) {
    if (alternatingHistory.length > 0 && alternatingHistory[alternatingHistory.length - 1].role === turn.role) {
      alternatingHistory[alternatingHistory.length - 1].parts.push(...turn.parts);
    } else {
      alternatingHistory.push({ role: turn.role, parts: [...turn.parts] });
    }
  }

  if (alternatingHistory.length > 0 && alternatingHistory[alternatingHistory.length - 1].role === "user") {
    alternatingHistory.pop();
  }

  const contents = [...alternatingHistory, { role: "user", parts: currentParts }];

  await pipeGeminiStreamToSSE(req, res, "AI Tutor", (ai, model) =>
    ai.models.generateContentStream({
      model,
      contents,
      config: {
        ...buildLowLatencyThinkingConfig(model),
        systemInstruction: fullInstruction,
      },
    })
  );
});

// 10. Payment screenshot validation
router.post("/validate-payment", async (req, res) => {
  try {
    const { imageBase64, planName, price } = req.body || {};
    if (!imageBase64) return res.status(400).json({ success: false, error: "Screenshot image is required." });

    const parsedImg = parseDataUrl(imageBase64, "image/jpeg");
    if (!parsedImg || !isSupportedInlineMime(parsedImg.mimeType)) {
      return res.status(400).json({ success: false, error: "Please upload a valid image screenshot." });
    }

    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;

    const result = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [{ inlineData: { mimeType: parsedImg.mimeType, data: parsedImg.data } }, { text: prompt }],
        },
        config: {
          ...buildLowLatencyThinkingConfig(model),
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
            },
            required: ["isValid", "reason"],
          },
        },
      });
      if (response.text) return safeParseJson<{ isValid: boolean; reason: string }>(response.text);
      throw new Error("AI returned an empty JSON response.");
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[Server Validate Payment Error]:", error);
    const classified = classifyGeminiHttpError(error, "Payment validation");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 11. Group AI Tutor
router.post("/group-tutor", async (req, res) => {
  try {
    const { groupName, subject, prompt, language = "English" } = req.body || {};
    const systemInstruction = `You are @AI Tutor, an empathetic, smart, and encouraging academic AI assistant participating in a student study group chat named "${groupName}" focused on "${subject}".
Your responses should be concise, helpful, friendly, and formatted nicely with clear explanations or bullet points. Keep it engaging like a group message. Respond in ${language}.`;

    const reply = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt || "Hello",
        config: {
          ...buildLowLatencyThinkingConfig(model),
          systemInstruction,
        },
      });
      const out = response.text?.trim() || "";
      if (!out) throw new Error("AI returned an empty response.");
      return out;
    });

    res.json({ success: true, text: reply });
  } catch (error: any) {
    console.error("[Server Group Tutor Error]:", error);
    const classified = classifyGeminiHttpError(error, "Group AI Tutor");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 12. Smart Timetable Generator
router.post("/smart-timetable", async (req, res) => {
  try {
    const { config, language = "English" } = req.body || {};
    if (!config || typeof config !== "object") {
      return res.status(400).json({ success: false, error: "Smart timetable configuration is required." });
    }

    const preferredDays: string[] =
      Array.isArray(config.availability?.preferredDays) && config.availability.preferredDays.length > 0
        ? config.availability.preferredDays
        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const prompt = `You are SJ Tutor AI's Smart Timetable Architect. Create a realistic, conflict-free weekly study timetable in ${language} based strictly on this student profile:
- Timetable Name: ${config.name}
- Class / Grade: ${config.gradeClass} (${config.board})
- Timetable Type: ${config.planType}
- Subjects: ${JSON.stringify(config.subjects || [])}
- Study Availability:
  - Preferred Days: ${preferredDays.join(", ")}
  - Primary Study Window: ${config.availability?.studyStartTime} to ${config.availability?.studyEndTime}
  - Periods Available: Morning=${config.availability?.morningAvailable}, Afternoon=${config.availability?.afternoonAvailable}, Evening=${config.availability?.eveningAvailable}, Night=${config.availability?.nightAvailable}
  - School Hours (DO NOT SCHEDULE HERE): ${config.availability?.hasSchoolHours ? `${config.availability.schoolStartTime} to ${config.availability.schoolEndTime} (Mon-Sat)` : "None"}
  - Coaching/Tuition Hours (DO NOT SCHEDULE HERE): ${config.availability?.hasCoachingHours ? `${config.availability.coachingStartTime} to ${config.availability.coachingEndTime}` : "None"}
  - Daily Travel Buffer: ${config.availability?.travelMinutesPerDay || 0} mins
- Break & Session Preferences:
  - Preferred Session Duration: ${config.breakPreferences?.sessionDurationMinutes || 45} mins
  - Max Continuous Study: ${config.breakPreferences?.maxContinuousStudyMinutes || 90} mins
  - Short Break: ${config.breakPreferences?.shortBreakMinutes || 10} mins, Long Break: ${config.breakPreferences?.longBreakMinutes || 25} mins
  - Sleep Schedule (DO NOT SCHEDULE HERE): ${config.breakPreferences?.sleepStartTime} to ${config.breakPreferences?.sleepEndTime}
  - Revision Frequency: ${config.breakPreferences?.revisionFrequency || "Daily"}
  - Auto-Insert Breaks: ${config.breakPreferences?.autoInsertBreaks ?? true}
- Exam Info: ${JSON.stringify(config.examInfo || {})}

STRICT SCHEDULING RULES:
1. Never schedule two subjects at the same time.
2. Never schedule during School Hours, Coaching Hours, or Sleep Schedule.
3. Schedule sessions across all Preferred Days (${preferredDays.join(", ")}).
4. Give extra study and revision sessions to 'Difficult' subjects, 'Needs Improvement' confidence subjects, and 'High' priority subjects.
5. Include 'Revision', 'Practice', and 'Break' sessions (if autoInsertBreaks is true).
6. For each day in Preferred Days, generate 3 to 5 focused sessions (plus breaks) with specific chapter/topic names.
7. Return JSON matching { aiAdvice: string, conflictWarning?: string, sessions: Array<{ day, startTime, endTime, durationMinutes, subject, topic, sessionType }> }.`;

    const result = await serverGeminiKeyManager.executeWithRotation(
      async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildLowLatencyThinkingConfig(model),
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                aiAdvice: { type: Type.STRING },
                conflictWarning: { type: Type.STRING },
                sessions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.STRING },
                      startTime: { type: Type.STRING },
                      endTime: { type: Type.STRING },
                      durationMinutes: { type: Type.INTEGER },
                      subject: { type: Type.STRING },
                      topic: { type: Type.STRING },
                      sessionType: { type: Type.STRING },
                    },
                    required: ["day", "startTime", "endTime", "durationMinutes", "subject", "topic", "sessionType"],
                  },
                },
              },
              required: ["aiAdvice", "sessions"],
            },
          },
        });

        if (!response.text || !response.text.trim()) {
          throw new Error("AI returned an empty JSON response.");
        }
        return safeParseJson<{
          aiAdvice?: string;
          conflictWarning?: string;
          sessions?: any[];
        }>(response.text);
      },
      undefined,
      { attemptTimeoutMs: 40000, overallDeadlineMs: 80000 }
    );

    res.json({
      success: true,
      aiAdvice:
        result.aiAdvice ||
        "Prioritize high-difficulty subjects during your peak focus hours and review key formulas before sleep.",
      conflictWarning: result.conflictWarning || undefined,
      sessions: Array.isArray(result.sessions) ? result.sessions : [],
    });
  } catch (error: any) {
    console.error("[Server Smart Timetable Error]:", error);
    const classified = classifyGeminiHttpError(error, "Smart timetable generation");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 13. AI Tutor Topic Check Questions & Follow-Up Prompts
router.post("/tutor-topic-questions", async (req, res) => {
  try {
    const { userQuestion = "", aiAnswer = "", subject = "General", grade = "General" } = req.body || {};
    const prompt = `Based on the student's question and the tutor's explanation below for ${grade} ${subject}, generate:
1. Exactly 2 multiple-choice practice questions (4 options each, 0-based correctAnswerIndex, and a concise explanation) that test the exact concept discussed.
2. Exactly 4 short, engaging follow-up questions the student can click to explore this topic deeper.

Student Question: "${String(userQuestion).slice(0, 400)}"
Tutor Explanation: "${String(aiAnswer).slice(0, 1200)}"`;

    const result = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          ...buildLowLatencyThinkingConfig(model),
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              practiceQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                  },
                  required: ["question", "options", "correctAnswerIndex", "explanation"],
                },
              },
              followUpPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["practiceQuestions", "followUpPrompts"],
          },
        },
      });

      if (!response.text) {
        throw new Error("AI returned an empty JSON response.");
      }
      const parsed = safeParseJson<{
        practiceQuestions?: any[];
        followUpPrompts?: string[];
      }>(response.text);

      const validPractice = validateAndNormalizeQuizQuestions(parsed.practiceQuestions || [], 2);
      const prompts = Array.isArray(parsed.followUpPrompts)
        ? parsed.followUpPrompts.filter((p) => typeof p === "string" && p.trim().length > 0).slice(0, 4)
        : [];
      return {
        practiceQuestions: validPractice,
        followUpPrompts: prompts,
      };
    });

    res.json({
      success: true,
      practiceQuestions: result.practiceQuestions,
      followUpPrompts: result.followUpPrompts,
    });
  } catch (error: any) {
    console.error("[Server Tutor Topic Questions Error]:", error);
    const classified = classifyGeminiHttpError(error, "Topic practice questions");
    res.status(classified.status).json({
      success: false,
      error: classified.message,
      practiceQuestions: [],
      followUpPrompts: [],
    });
  }
});

export default router;
