import { Router } from "express";
import { Type, ThinkingLevel } from "@google/genai";
import { createDedicatedGeminiClient } from "../geminiClient";

const DEFAULT_GEMINI_MODELS = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];

function buildLowLatencyThinkingConfig(model: string) {
  return model === "gemini-4-hydrogen"
    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    : {};
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
    // Attempt to recover a complete JSON array or object surrounded by extra prose
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
        // fall through to clean retryable error
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

function resolveCorrectAnswerIndex(rawIndex: unknown, optionsLength: number): number | null {
  if (typeof rawIndex === "number" && Number.isInteger(rawIndex)) {
    return rawIndex >= 0 && rawIndex < optionsLength ? rawIndex : null;
  }
  if (typeof rawIndex === "string") {
    const trimmed = rawIndex.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 10);
      return parsed >= 0 && parsed < optionsLength ? parsed : null;
    }
    const letterMatch = trimmed.match(/^(?:option\s*)?([A-Za-z])(?:[.)])?$/i);
    if (letterMatch) {
      const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      return idx >= 0 && idx < optionsLength ? idx : null;
    }
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
    const rawOptions = q.options.map((opt: unknown) => (typeof opt === "string" ? opt.trim() : String(opt ?? "").trim()));

    // Keep track of original index mapping if any blank trailing options were omitted
    const nonEmptyWithOriginalIdx = rawOptions
      .map((text: string, originalIdx: number) => ({ text, originalIdx }))
      .filter((entry: { text: string; originalIdx: number }) => entry.text.length > 0);

    if (nonEmptyWithOriginalIdx.length < 2) continue;

    const rawResolvedIdx = resolveCorrectAnswerIndex(q.correctAnswerIndex, rawOptions.length);
    if (rawResolvedIdx === null) continue;

    const mappedIdx = nonEmptyWithOriginalIdx.findIndex(
      (entry: { text: string; originalIdx: number }) => entry.originalIdx === rawResolvedIdx
    );
    if (mappedIdx === -1) continue;

    const options = nonEmptyWithOriginalIdx.map((entry: { text: string }) => entry.text);
    const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
    if (!explanation) continue;

    validQuestions.push({
      question: questionText,
      options,
      correctAnswerIndex: mappedIdx,
      explanation,
    });
  }

  const minimumRequired = Math.min(requestedCount, Math.max(1, Math.ceil(requestedCount * 0.7)));
  if (validQuestions.length < minimumRequired) {
    throw new Error(
      `Quiz generator returned incomplete or malformed questions (${validQuestions.length}/${requestedCount} valid). Please try again.`
    );
  }

  return validQuestions.slice(0, requestedCount);
}

function classifyGeminiHttpError(error: any, fallbackMessage: string): { status: number; message: string } {
  const rawMsg = String(error?.message || error || "");
  const lower = rawMsg.toLowerCase();
  const explicitStatus = Number(error?.status || error?.statusCode || 0);

  if (lower.includes("timed out") || explicitStatus === 504) {
    return {
      status: 504,
      message: "Quiz generation took too long to respond. Please try again or use fewer questions.",
    };
  }
  if (
    explicitStatus === 429 ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("high demand") ||
    lower.includes("overloaded")
  ) {
    return {
      status: 429,
      message: "The AI service is temporarily busy due to high demand or quota limits. Please wait a moment and click Retry.",
    };
  }
  if (explicitStatus === 403 || lower.includes("permission_denied") || lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
    return {
      status: 403,
      message: "Server Gemini API configuration could not be authorized. Please verify your server API key settings.",
    };
  }
  if (lower.includes("invalid or incomplete json") || lower.includes("incomplete or malformed questions") || lower.includes("empty json") || lower.includes("empty question list")) {
    return {
      status: 502,
      message: rawMsg || "The AI returned an invalid quiz format. Please click Retry.",
    };
  }
  return {
    status: 500,
    message: rawMsg || fallbackMessage,
  };
}

function withAttemptTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

export interface ServerKeySlot {
  id: string;
  key: string;
  masked: string;
  status: "ACTIVE" | "HIGH_DEMAND" | "COOLING_DOWN";
  cooldownUntil: number;
  requests: number;
  highDemandCount: number;
}

export class ServerGeminiKeyManager {
  private slots: ServerKeySlot[] = [];
  private currentIndex: number = 0;
  private readonly COOLDOWN_MS = 60000;

  constructor() {
    this.refresh();
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
          status: existing ? existing.status : "ACTIVE",
          cooldownUntil: existing ? existing.cooldownUntil : 0,
          requests: existing ? existing.requests : 0,
          highDemandCount: existing ? existing.highDemandCount : 0,
        });
      }
    }
    this.slots = newSlots;
    return this.slots;
  }

  public isHighDemandError(err: any): boolean {
    if (!err) return false;
    const msg = String(err?.message || err?.statusText || err || "").toLowerCase();
    const status = err?.status || err?.statusCode;
    if (status === 429 || status === 503 || status === 500 || status === 502) return true;
    return (
      msg.includes("429") ||
      msg.includes("resource_exhausted") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("ratelimit") ||
      msg.includes("high demand") ||
      msg.includes("overloaded") ||
      msg.includes("capacity") ||
      msg.includes("too many requests") ||
      msg.includes("service unavailable") ||
      msg.includes("503") ||
      msg.includes("try again later")
    );
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
    const active = slots[this.currentIndex % (slots.length || 1)];
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
        inCooldown: s.cooldownUntil > Date.now(),
        cooldownRemainingSec: Math.max(0, Math.ceil((s.cooldownUntil - Date.now()) / 1000)),
      })),
    };
  }

  public isModelNotFoundError(err: any): boolean {
    const status = err?.status || err?.statusCode;
    const msg = String(err?.message || err || "").toLowerCase();
    return status === 404 || msg.includes("not_found") || (msg.includes("model") && msg.includes("not found"));
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
    const attemptTimeoutMs = timeouts?.attemptTimeoutMs ?? 20000;
    const overallDeadlineMs = timeouts?.overallDeadlineMs ?? 50000;
    const totalSlots = slots.length;
    const startIdx = this.currentIndex % totalSlots;
    this.currentIndex = (this.currentIndex + 1) % totalSlots;

    // Order active keys first, cooling-down keys last
    const orderedIndices: number[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const idx = (startIdx + i) % totalSlots;
      if (slots[idx].cooldownUntil <= Date.now()) orderedIndices.push(idx);
    }
    for (let i = 0; i < totalSlots; i++) {
      const idx = (startIdx + i) % totalSlots;
      if (slots[idx].cooldownUntil > Date.now()) orderedIndices.push(idx);
    }

    let lastErr: any = null;
    const overallDeadline = Date.now() + overallDeadlineMs;

    for (let mIdx = 0; mIdx < preferredModels.length; mIdx++) {
      const currentModel = preferredModels[mIdx];
      let attemptsOnThisModel = 0;
      for (let i = 0; i < orderedIndices.length; i++) {
        if (Date.now() > overallDeadline && mIdx > 0) {
          break;
        }
        const slotIdx = orderedIndices[i];
        const currentSlot = slots[slotIdx];
        currentSlot.requests++;
        attemptsOnThisModel++;
        const startedAt = Date.now();

        try {
          const ai = createDedicatedGeminiClient(currentSlot.key);
          const result = await withAttemptTimeout(
            operation(ai, currentModel, currentSlot),
            attemptTimeoutMs,
            `Gemini ${currentModel}`
          );
          currentSlot.status = "ACTIVE";
          currentSlot.cooldownUntil = 0;
          return result;
        } catch (err: any) {
          lastErr = err;
          const elapsed = Date.now() - startedAt;
          const highDemand = this.isHighDemandError(err);
          const modelMissing = this.isModelNotFoundError(err);
          const timedOut = String(err?.message || "").includes("timed out");

          if (highDemand) {
            currentSlot.status = "HIGH_DEMAND";
            currentSlot.highDemandCount++;
            currentSlot.cooldownUntil = Date.now() + this.COOLDOWN_MS;
          }

          console.warn(
            `[Server Gemini] Error (${elapsed}ms) on ${currentSlot.id} (${currentSlot.masked}) model ${currentModel}: ${err?.message || err}`
          );

          if ((modelMissing || timedOut || attemptsOnThisModel >= 2) && mIdx < preferredModels.length - 1) {
            break; // Quickly fall back to next model instead of burning timeout budget across all keys
          }

          if (i === orderedIndices.length - 1 && mIdx === preferredModels.length - 1) {
            throw lastErr;
          }
        }
      }
    }
    throw lastErr || new Error("All Gemini keys and fallback models failed on server.");
  }

  public async executeStreamWithRotation(
    streamBuilder: (ai: ReturnType<typeof createDedicatedGeminiClient>, model: string, slot: ServerKeySlot) => Promise<any>,
    modelsOverride?: string[]
  ): Promise<any> {
    const slots = this.getSlots();
    if (slots.length === 0) {
      throw new Error("No valid Gemini API keys configured on server.");
    }

    const preferredModels = modelsOverride && modelsOverride.length > 0 ? modelsOverride : DEFAULT_GEMINI_MODELS;
    const totalSlots = slots.length;
    const startIdx = this.currentIndex % totalSlots;
    this.currentIndex = (this.currentIndex + 1) % totalSlots;

    const orderedIndices: number[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const idx = (startIdx + i) % totalSlots;
      if (slots[idx].cooldownUntil <= Date.now()) orderedIndices.push(idx);
    }
    for (let i = 0; i < totalSlots; i++) {
      const idx = (startIdx + i) % totalSlots;
      if (slots[idx].cooldownUntil > Date.now()) orderedIndices.push(idx);
    }

    let lastErr: any = null;
    const overallDeadline = Date.now() + 48000;

    for (let mIdx = 0; mIdx < preferredModels.length; mIdx++) {
      const currentModel = preferredModels[mIdx];
      let attemptsOnThisModel = 0;
      for (let i = 0; i < orderedIndices.length; i++) {
        if (Date.now() > overallDeadline && mIdx > 0) {
          break;
        }
        const slotIdx = orderedIndices[i];
        const currentSlot = slots[slotIdx];
        currentSlot.requests++;
        attemptsOnThisModel++;
        const startedAt = Date.now();

        try {
          const ai = createDedicatedGeminiClient(currentSlot.key);
          const stream = await withAttemptTimeout(
            streamBuilder(ai, currentModel, currentSlot),
            18000,
            `Gemini stream ${currentModel}`
          );
          currentSlot.status = "ACTIVE";
          currentSlot.cooldownUntil = 0;
          return stream;
        } catch (err: any) {
          lastErr = err;
          const elapsed = Date.now() - startedAt;
          const highDemand = this.isHighDemandError(err);
          const modelMissing = this.isModelNotFoundError(err);
          const timedOut = String(err?.message || "").includes("timed out");

          if (highDemand) {
            currentSlot.status = "HIGH_DEMAND";
            currentSlot.highDemandCount++;
            currentSlot.cooldownUntil = Date.now() + this.COOLDOWN_MS;
          }

          console.warn(
            `[Server Gemini Stream] Error (${elapsed}ms) on ${currentSlot.id} (${currentSlot.masked}) model ${currentModel}: ${err?.message || err}`
          );

          if ((modelMissing || timedOut || attemptsOnThisModel >= 2) && mIdx < preferredModels.length - 1) {
            break;
          }

          if (i === orderedIndices.length - 1 && mIdx === preferredModels.length - 1) {
            throw lastErr;
          }
        }
      }
    }
    throw lastErr || new Error("Failed to start Gemini stream on server.");
  }
}

export const serverGeminiKeyManager = new ServerGeminiKeyManager();

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
    if (!content) return res.status(400).json({ error: "Note content is required" });

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
      return response.text || "";
    });

    res.json({ success: true, text });
  } catch (error: any) {
    console.error("[Server Note AI Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to process note" });
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
      return response.text || "";
    });

    res.json({ success: true, text });
  } catch (error: any) {
    console.error("[Server Note Template Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to generate template" });
  }
});

// 4. Generate AI Syllabus Notes
router.post("/ai-notes", async (req, res) => {
  try {
    const { classGrade, board, subject, language = "English", chapterName, author, maxCharacters = 4000, difficulty = "Medium" } = req.body || {};

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

    const text = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          ...buildLowLatencyThinkingConfig(model),
          systemInstruction,
        },
      });
      return response.text || "";
    });

    res.json({ success: true, text });
  } catch (error: any) {
    console.error("[Server AI Notes Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to generate AI notes" });
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

    const rawCount = data.questionCount === undefined || data.questionCount === null || data.questionCount === ""
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
    const authorLine = typeof data.author === "string" && data.author.trim() ? `\n      Author/Textbook Reference: ${data.author.trim()}` : "";

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

    const attemptTimeoutMs = count >= 25 ? 35000 : count >= 12 ? 25000 : 20000;
    const overallDeadlineMs = count >= 25 ? 70000 : 50000;

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
    const classified = classifyGeminiHttpError(error, "Failed to generate quiz. Please try again.");
    res.status(classified.status).json({ success: false, error: classified.message });
  }
});

// 6. Generate Study Timetable
router.post("/timetable", async (req, res) => {
  try {
    const { examDate, subjects, hoursPerDay, language = "English" } = req.body || {};
    const today = new Date().toDateString();
    const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;

    const timetable = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
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
      throw new Error("Failed to generate timetable");
    });

    res.json({ success: true, timetable });
  } catch (error: any) {
    console.error("[Server Timetable Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to generate timetable" });
  }
});

// 7. Update Study Timetable
router.post("/timetable/update", async (req, res) => {
  try {
    const { currentTimetable, instruction, language = "English" } = req.body || {};
    const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;

    const timetable = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
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
      throw new Error("Failed to update timetable");
    });

    res.json({ success: true, timetable });
  } catch (error: any) {
    console.error("[Server Timetable Update Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to update timetable" });
  }
});

// 8. Chat With Tutor (Non-streaming)
router.post("/tutor-chat", async (req, res) => {
  try {
    const { text, history = [], imagesBase64 = [], systemInstruction } = req.body || {};

    const currentParts: any[] = [{ text: (text || "").trim() || "Hello" }];
    imagesBase64.forEach((img: string) => {
      const cleanBase64 = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      currentParts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64 } });
    });

    const cleanHistory: { role: string; parts: any[] }[] = [];
    for (const msg of history) {
      if (!msg) continue;
      const parts: any[] = [];
      if (msg.images && Array.isArray(msg.images)) {
        msg.images.forEach((img: string) => {
          const clean = img.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
          parts.push({ inlineData: { mimeType: "image/jpeg", data: clean } });
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
      return response.text || "";
    });

    res.json({ success: true, text: reply });
  } catch (error: any) {
    console.error("[Server Tutor Chat Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to chat with tutor" });
  }
});

// 9. Streaming endpoints (Summary, Homework, Tutor Chat) using Server-Sent Events (SSE)
router.post("/summary-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(": connected\n\n");

  try {
    const { data, systemInstruction } = req.body || {};
    if (!data) {
      throw new Error("Study request data is required");
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

    const stream = await serverGeminiKeyManager.executeStreamWithRotation(async (ai, model) => {
      return ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          ...buildLowLatencyThinkingConfig(model),
          systemInstruction: systemInstruction || `You are an expert academic tutor and notes creator. You generate high quality, structured syllabus-aligned notes only in ${language}.`,
        },
      });
    });

    let emitted = false;
    for await (const chunk of stream) {
      if (res.writableEnded) break;
      const text = chunk.text || "";
      if (text) {
        emitted = true;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    if (!res.writableEnded) {
      if (!emitted) {
        res.write(`data: ${JSON.stringify({ error: "AI returned an empty summary. Please click Retry." })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error: any) {
    console.error("[Server Summary Stream Error]:", error);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error?.message || "Stream failed" })}\n\n`);
      res.end();
    }
  }
});

router.post("/homework-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(": connected\n\n");

  try {
    const { data, files = [], systemInstruction } = req.body || {};
    if (!data) {
      throw new Error("Homework request data is required");
    }
    const language = data.language || "English";

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
      ${files.length > 0 ? `Files/Images Attached: I have attached ${files.length} file(s)/document(s)/image(s) of the homework/problem.` : "No files provided."}
      
      Requirements:
      - Carefully analyze ALL inputs (text, images, and documents).
      - If files are provided (such as PDFs, photos, DOCS, SHEETS, or TEXT files), extract the questions, data, or problems from them.
      - Provide a clear, step-by-step solution for all identified problems.
      - Explain the underlying concepts simply so the student can learn, not just copy.
      - THE ENTIRE RESPONSE MUST BE IN ${String(language).toUpperCase()}.
      
      If the inputs are unclear or do not contain educational problems, politely ask the student for more details or clearer files.
    `;

    const contents: any[] = [{ text: prompt }];
    files.forEach((file: any) => {
      const matches = file.dataUrl?.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : file.type || "image/jpeg";
      const cleanBase64 = matches ? matches[2] : file.dataUrl;
      if (cleanBase64) {
        contents.push({ inlineData: { mimeType, data: cleanBase64 } });
      }
    });

    const stream = await serverGeminiKeyManager.executeStreamWithRotation(async (ai, model) => {
      return ai.models.generateContentStream({
        model,
        contents: { parts: contents },
        config: {
          ...buildLowLatencyThinkingConfig(model),
          systemInstruction: systemInstruction || `You are an expert Homework Solver and Academic Tutor. You generate content only in ${language}.`,
        },
      });
    });

    let emitted = false;
    for await (const chunk of stream) {
      if (res.writableEnded) break;
      const text = chunk.text || "";
      if (text) {
        emitted = true;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    if (!res.writableEnded) {
      if (!emitted) {
        res.write(`data: ${JSON.stringify({ error: "AI returned an empty solution. Please click Retry." })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error: any) {
    console.error("[Server Homework Stream Error]:", error);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error?.message || "Stream failed" })}\n\n`);
      res.end();
    }
  }
});

router.post("/tutor-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(": connected\n\n");

  try {
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
    extraFiles.forEach((f: any) => {
      if (f.textContent) {
        fileContext += `\n[Attached File: ${f.name}]\nType: ${f.type}\nContent:\n${f.textContent}\n`;
      } else if (f.dataUrl) {
        const matches = f.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          currentParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
        }
      }
    });

    imagesBase64.forEach((img: string) => {
      const matches = img.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        currentParts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
      } else {
        currentParts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
      }
    });

    let finalPrompt = text ? String(text).trim() : "";
    if (fileContext) {
      finalPrompt = `${fileContext}\n\nUser Question:\n${finalPrompt}`;
    }
    if (!finalPrompt) {
      finalPrompt = "Please examine and explain the attached image/file step-by-step.";
    }
    currentParts.push({ text: finalPrompt });

    const cleanHistory: { role: string; parts: any[] }[] = [];
    for (const msg of history) {
      if (!msg) continue;
      const parts: any[] = [];
      if (msg.images && Array.isArray(msg.images)) {
        msg.images.forEach((img: string) => {
          const matches = img.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
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

    const stream = await serverGeminiKeyManager.executeStreamWithRotation(async (ai, model) => {
      return ai.models.generateContentStream({
        model,
        contents,
        config: {
          ...buildLowLatencyThinkingConfig(model),
          systemInstruction: fullInstruction,
        },
      });
    });

    let emitted = false;
    for await (const chunk of stream) {
      if (res.writableEnded) break;
      const chunkText = chunk.text || "";
      if (chunkText) {
        emitted = true;
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }
    if (!res.writableEnded) {
      if (!emitted) {
        res.write(`data: ${JSON.stringify({ error: "AI returned an empty response. Please click Retry." })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error: any) {
    console.error("[Server Tutor Stream Error]:", error);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error?.message || "Tutor stream failed" })}\n\n`);
      res.end();
    }
  }
});

// 10. Payment screenshot validation
router.post("/validate-payment", async (req, res) => {
  try {
    const { imageBase64, planName, price } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: "Screenshot image is required" });

    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : "image/jpeg";
    const cleanData = matches ? matches[2] : imageBase64;

    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;

    const result = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [{ inlineData: { mimeType, data: cleanData } }, { text: prompt }],
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
      throw new Error("No response from payment validator");
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[Server Validate Payment Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to validate payment screenshot" });
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
        contents: prompt,
        config: {
          ...buildLowLatencyThinkingConfig(model),
          systemInstruction,
        },
      });
      return response.text || "";
    });

    res.json({ success: true, text: reply });
  } catch (error: any) {
    console.error("[Server Group Tutor Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to respond in group" });
  }
});

// 12. Smart Timetable Generator
router.post("/smart-timetable", async (req, res) => {
  try {
    const { config, language = "English" } = req.body || {};
    if (!config || typeof config !== "object") {
      return res.status(400).json({ success: false, error: "Smart timetable configuration is required" });
    }

    const preferredDays: string[] = Array.isArray(config.availability?.preferredDays) && config.availability.preferredDays.length > 0
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
          throw new Error("The AI did not return a timetable response. Please click Retry.");
        }
        return safeParseJson<{
          aiAdvice?: string;
          conflictWarning?: string;
          sessions?: any[];
        }>(response.text);
      },
      undefined,
      { attemptTimeoutMs: 35000, overallDeadlineMs: 70000 }
    );

    res.json({
      success: true,
      aiAdvice: result.aiAdvice || "Prioritize high-difficulty subjects during your peak focus hours and review key formulas before sleep.",
      conflictWarning: result.conflictWarning || undefined,
      sessions: Array.isArray(result.sessions) ? result.sessions : [],
    });
  } catch (error: any) {
    console.error("[Server Smart Timetable Error]:", error);
    const classified = classifyGeminiHttpError(error, "Failed to generate smart timetable. Please try again.");
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
        throw new Error("Empty tutor topic questions response");
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
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to generate tutor topic questions",
      practiceQuestions: [],
      followUpPrompts: [],
    });
  }
});

export default router;
