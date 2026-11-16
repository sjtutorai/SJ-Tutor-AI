import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, HomeworkFile, DifficultyLevel } from "../types";
import { SettingsService } from "./settingsService";

declare const __FALLBACK_GEMINI_KEYS__: string[] | undefined;

export interface KeySlot {
  id: string;
  masked: string;
  status: 'ACTIVE' | 'HIGH_DEMAND' | 'COOLING_DOWN' | 'INVALID';
  totalRequests: number;
  successCount: number;
  failureCount: number;
  highDemandCount: number;
  cooldownUntil?: number;
  lastUsedAt?: number;
  lastError?: string;
  inCooldown?: boolean;
  cooldownRemainingSec?: number;
}

export interface KeyManagerStatus {
  totalKeys: number;
  activeKeyId: string;
  activeKeyMasked: string;
  highDemandAutoSwitchEnabled: boolean;
  keys: {
    id: string;
    masked: string;
    status: 'ACTIVE' | 'HIGH_DEMAND' | 'COOLING_DOWN' | 'INVALID';
    totalRequests: number;
    successCount: number;
    failureCount: number;
    highDemandCount: number;
    inCooldown: boolean;
    cooldownRemainingSec: number;
  }[];
}

let cachedStatus: KeyManagerStatus = {
  totalKeys: 1,
  activeKeyId: "GEMINI_API_KEY",
  activeKeyMasked: "Secured on Server",
  highDemandAutoSwitchEnabled: true,
  keys: [
    {
      id: "GEMINI_API_KEY",
      masked: "Secured on Server",
      status: "ACTIVE",
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      highDemandCount: 0,
      inCooldown: false,
      cooldownRemainingSec: 0,
    },
  ],
};

const CLIENT_FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-4-hydrogen",
];

function getClientFallbackKeys(): string[] {
  const candidates: string[] = [];
  try {
    if (typeof __FALLBACK_GEMINI_KEYS__ !== "undefined" && Array.isArray(__FALLBACK_GEMINI_KEYS__)) {
      candidates.push(...__FALLBACK_GEMINI_KEYS__);
    }
  } catch {
    // ignore
  }
  try {
    const win = typeof window !== "undefined" ? (window as any) : undefined;
    if (win?.GEMINI_API_KEY) candidates.push(String(win.GEMINI_API_KEY));
    if (win?.API_KEY) candidates.push(String(win.API_KEY));
    if (win?.process?.env?.GEMINI_API_KEY) candidates.push(String(win.process.env.GEMINI_API_KEY));
    if (win?.process?.env?.API_KEY) candidates.push(String(win.process.env.API_KEY));
  } catch {
    // ignore
  }
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv?.VITE_GEMINI_API_KEY) candidates.push(String(metaEnv.VITE_GEMINI_API_KEY));
    if (metaEnv?.VITE_GEMINI_API_KEY_1) candidates.push(String(metaEnv.VITE_GEMINI_API_KEY_1));
    if (metaEnv?.VITE_GEMINI_API_KEY_2) candidates.push(String(metaEnv.VITE_GEMINI_API_KEY_2));
  } catch {
    // ignore
  }
  // Always include 'GEMINI_API_KEY' sentinel for AI Studio iframe fetch bridge
  candidates.push("GEMINI_API_KEY");

  const unique: string[] = [];
  for (const raw of candidates) {
    const trimmed = (raw || "").trim();
    if (trimmed && trimmed !== "undefined" && trimmed !== "null" && !unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  }
  return unique;
}

function buildThinkingConfig(model: string) {
  return model === "gemini-3-flash-preview" || model === "gemini-4-hydrogen"
    ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    : {};
}

async function executeDirectGeminiFallback<T>(
  operation: (ai: GoogleGenAI, model: string) => Promise<T>,
  models: string[] = CLIENT_FALLBACK_MODELS
): Promise<T> {
  const keys = getClientFallbackKeys();
  let lastError: any = null;

  for (const model of models) {
    for (const apiKey of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        return await operation(ai, model);
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err || "").toLowerCase();
        // If model is not found (404), break out of key loop and try next model immediately
        if (err?.status === 404 || msg.includes("not_found") || (msg.includes("model") && msg.includes("not found"))) {
          break;
        }
      }
    }
  }
  throw lastError || new Error("Unable to reach the AI service. Please click Retry.");
}

async function executeDirectGeminiStreamFallback(
  streamBuilder: (ai: GoogleGenAI, model: string) => Promise<any>,
  models: string[] = CLIENT_FALLBACK_MODELS
): Promise<AsyncIterable<{ text?: string }>> {
  const keys = getClientFallbackKeys();
  let lastError: any = null;

  for (const model of models) {
    for (const apiKey of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const rawStream = await streamBuilder(ai, model);
        return (async function* () {
          let emitted = false;
          for await (const chunk of rawStream) {
            const text = chunk?.text || "";
            if (text) {
              emitted = true;
              yield { text };
            }
          }
          if (!emitted) {
            throw new Error("The AI did not return any content. Please click Retry.");
          }
        })();
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err || "").toLowerCase();
        if (err?.status === 404 || msg.includes("not_found") || (msg.includes("model") && msg.includes("not found"))) {
          break;
        }
      }
    }
  }
  throw lastError || new Error("Unable to start AI stream. Please click Retry.");
}

function safeParseJsonClient<T>(raw: string): T {
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
        // continue
      }
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        // continue
      }
    }
    throw new Error("AI returned an invalid or incomplete JSON response. Please try again.");
  }
}

function resolveAnswerIdxClient(rawIndex: unknown, optionsLength: number): number | null {
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

function validateAndNormalizeQuizClient(parsed: unknown, requestedCount: number): QuizQuestion[] {
  const rawQuestions: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as any)?.questions)
    ? (parsed as any).questions
    : [];

  if (rawQuestions.length === 0) {
    throw new Error("The AI did not return any quiz questions. Please try again.");
  }

  const validQuestions: QuizQuestion[] = [];
  for (const q of rawQuestions) {
    if (!q || typeof q !== "object") continue;
    const questionText = typeof q.question === "string" ? q.question.trim() : "";
    if (!questionText || !Array.isArray(q.options)) continue;

    const rawOptions = q.options.map((opt: unknown) => (typeof opt === "string" ? opt.trim() : String(opt ?? "").trim()));
    const nonEmptyWithOriginalIdx = rawOptions
      .map((text: string, originalIdx: number) => ({ text, originalIdx }))
      .filter((entry: { text: string; originalIdx: number }) => entry.text.length > 0);

    if (nonEmptyWithOriginalIdx.length < 2) continue;

    const rawResolvedIdx = resolveAnswerIdxClient(q.correctAnswerIndex, rawOptions.length);
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

  if (validQuestions.length === 0) {
    throw new Error("The AI returned malformed quiz questions. Please click Retry to generate a fresh quiz.");
  }

  return validQuestions.slice(0, requestedCount);
}

class BackendFallbackTriggerError extends Error {
  public readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "BackendFallbackTriggerError";
    this.status = status;
  }
}

async function fetchWithWarmupRetry(
  url: string,
  init: RequestInit,
  retries = 1,
  timeoutMs = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "include",
      ...init,
      signal: init.signal || controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      throw new BackendFallbackTriggerError("The request timed out while waiting for the AI server.", 504);
    }
    throw new BackendFallbackTriggerError("Unable to reach the AI server.", 0);
  } finally {
    clearTimeout(timer);
  }

  if (retries > 0 && (res.status === 502 || res.status === 503 || res.status === 504)) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return fetchWithWarmupRetry(url, init, retries - 1, timeoutMs);
  }
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  if (retries > 0 && contentType.includes("text/html")) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return fetchWithWarmupRetry(url, init, retries - 1, timeoutMs);
  }
  return res;
}

async function safeReadJsonResponse(res: Response, actionLabel: string): Promise<any> {
  const rawText = await res.text();
  if (!rawText || !rawText.trim()) {
    throw new BackendFallbackTriggerError(
      res.ok
        ? `${actionLabel}: Server returned an empty response. Please click Retry.`
        : `${actionLabel} failed (HTTP ${res.status}). Please click Retry.`,
      res.status
    );
  }
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new BackendFallbackTriggerError(
      `${actionLabel}: Non-JSON response from server (HTTP ${res.status}).`,
      res.status
    );
  }
  if (!res.ok) {
    if (res.status === 404 || res.status === 405 || res.status === 502 || res.status === 503 || res.status === 504) {
      throw new BackendFallbackTriggerError(
        parsed?.error || parsed?.message || `${actionLabel} failed (HTTP ${res.status}).`,
        res.status
      );
    }
    throw new Error(parsed?.error || parsed?.message || `${actionLabel} failed (HTTP ${res.status}).`);
  }
  return parsed;
}

// Asynchronously fetch live key pool status from backend
async function fetchKeyStatus(): Promise<KeyManagerStatus> {
  try {
    const res = await fetch("/api/ai/status", { credentials: "include" });
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim() && !text.trim().startsWith("<")) {
        const data = JSON.parse(text);
        if (data?.success) {
          cachedStatus = data;
        }
      }
    }
  } catch (err) {
    console.debug("[Client Key Status] Notice:", err);
  }
  return cachedStatus;
}

// Initial eager fetch
if (typeof window !== "undefined") {
  fetchKeyStatus();
}

/**
 * Helper to parse Server-Sent Events (SSE) stream returned by the server.
 */
async function* parseSSEStream(response: Response): AsyncGenerator<{ text?: string; error?: string }> {
  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let receivedAnyText = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) continue;

        const payload = trimmed.replace(/^data:\s*/, "");
        if (payload === "[DONE]") {
          if (!receivedAnyText) {
            throw new Error("The AI did not return any content. Please click Retry.");
          }
          return;
        }

        let parsed: any = null;
        try {
          parsed = JSON.parse(payload);
        } catch (e: any) {
          if (e?.message && e.message !== "Unexpected end of JSON input") {
            console.debug("[SSE Chunk Parse Notice]:", e);
          }
          continue;
        }

        if (parsed?.error) {
          throw new Error(parsed.error);
        }
        if (parsed?.text !== undefined) {
          if (parsed.text) receivedAnyText = true;
          yield { text: parsed.text };
        }
      }
    }

    if (buffer.trim().startsWith("data:")) {
      const payload = buffer.trim().replace(/^data:\s*/, "");
      if (payload !== "[DONE]") {
        let parsed: any = null;
        try {
          parsed = JSON.parse(payload);
        } catch (e: any) {
          console.debug("[SSE trailing chunk parse notice]:", e?.message || e);
        }
        if (parsed?.error) {
          throw new Error(parsed.error);
        }
        if (parsed?.text) {
          receivedAnyText = true;
          yield { text: parsed.text };
        }
      }
    }

    if (!receivedAnyText) {
      throw new Error("The AI stream ended without content. Please click Retry.");
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Dual-Path Gemini Service:
 * Uses backend /api/ai/* routes first and seamlessly falls back to direct @google/genai execution
 * whenever the backend route is unreachable or returns a 404/gateway error (e.g. static deployments or iframe proxy intercepts).
 */
export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = targetLang || settings.learning.language;

    try {
      const res = await fetchWithWarmupRetry("/api/ai/note-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, task, language }),
      });

      const data = await safeReadJsonResponse(res, "Note AI");
      if (!data.success) {
        throw new Error(data.error || "Failed to process note");
      }
      return data.text || "";
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const taskPrompts: Record<string, string> = {
        summarize: `Create a bulleted 'Revision Box' summary for the following note in ${language}. Focus on key definitions and dates.`,
        simplify: `Rewrite this note in very simple ${language} so a younger student can understand it perfectly.`,
        mcq: `Generate 5 high-quality Multiple Choice Questions with answers in ${language} based ONLY on this note content. Return as Markdown list.`,
        translate: `Translate this note professionally into ${language}, maintaining academic terminology where appropriate.`,
      };
      const promptText = `${taskPrompts[task] || taskPrompts.summarize}\n\nNOTE CONTENT:\n${content}`;
      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: promptText,
          config: {
            ...buildThinkingConfig(model),
            systemInstruction: `You are an AI study assistant. You must communicate and generate content strictly in ${language}.`,
          },
        });
        return response.text || "";
      });
    }
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

    try {
      const res = await fetchWithWarmupRetry("/api/ai/note-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, chapter, templateType, language }),
      });

      const data = await safeReadJsonResponse(res, "Note Template");
      if (!data.success) {
        throw new Error(data.error || "Failed to generate note template");
      }
      return data.text || "";
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
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
      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { ...buildThinkingConfig(model) },
        });
        return response.text || "";
      });
    }
  },

  /**
   * Generates highly structured, curriculum-aligned notes.
   */
  generateAiNotes: async (params: {
    classGrade: string;
    board: string;
    subject: string;
    language: string;
    chapterName: string;
    author?: string;
    maxCharacters: number;
    difficulty?: DifficultyLevel;
  }): Promise<string> => {
    try {
      const res = await fetchWithWarmupRetry("/api/ai/ai-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await safeReadJsonResponse(res, "AI Notes");
      if (!data.success) {
        throw new Error(data.error || "Failed to generate AI notes");
      }
      return data.text || "";
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const { classGrade, board, subject, language = "English", chapterName, author, maxCharacters = 4000, difficulty = "Medium" } = params;
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
5. Use clear Markdown headings (# ${chapterName}, ## Overview, ## Key Concepts, ## Important Definitions, ## Detailed Explanation, ## Important Points, ## Examples, ## Quick Revision Summary).
`;
      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildThinkingConfig(model),
            systemInstruction,
          },
        });
        return response.text || "";
      });
    }
  },

  // Alias for backward compatibility with component callers
  generateStudyNotes: async (params: {
    classGrade: string;
    board: string;
    subject: string;
    language: string;
    chapterName: string;
    author?: string;
    maxCharacters: number;
    difficulty?: DifficultyLevel;
  }): Promise<string> => {
    return GeminiService.generateAiNotes(params);
  },

  /**
   * Generates comprehensive chapter summary and notes in streaming mode.
   */
  generateSummaryStream: async (data: StudyRequestData): Promise<AsyncIterable<{ text?: string }>> => {
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language || "English";
    const systemInstruction = `You are an expert academic tutor and notes creator. Personality: ${settings.aiTutor.personality}. You generate high quality, structured syllabus-aligned notes only in ${language}.`;

    try {
      const res = await fetchWithWarmupRetry("/api/ai/summary-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, systemInstruction }),
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || !contentType.includes("text/event-stream")) {
        throw new BackendFallbackTriggerError(`Summary stream fallback (${res.status})`, res.status);
      }

      return parseSSEStream(res);
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const maxChars = data.maxCharacters || 5000;
      const difficulty = data.difficulty || "Medium";
      const prompt = `
        Create a comprehensive, syllabus-aligned, and structured study notes & summary for the following:
        THE ENTIRE NOTES/SUMMARY MUST BE WRITTEN IN ${String(language).toUpperCase()}.
        
        Subject: ${data.subject}
        Class/Grade: ${data.gradeClass || "General"}
        Education Board: ${data.board}
        Language: ${language}
        Chapter/Topic: ${data.chapterName}
        ${data.author ? `Author/Poet: ${data.author}` : ""}
        Depth & Difficulty Level: ${difficulty}
        Target Character Limit: Approximately ${maxChars} characters.

        Please format the study notes cleanly with Markdown:
        # ${data.chapterName}
        ## Overview
        ## Key Concepts & Theory
        ## Important Definitions & Formulas
        ## Step-by-Step Explanations & Examples
        ## Quick Revision Summary & Key Takeaways
      `;
      return executeDirectGeminiStreamFallback(async (ai, model) => {
        return ai.models.generateContentStream({
          model,
          contents: prompt,
          config: {
            ...buildThinkingConfig(model),
            systemInstruction,
          },
        });
      });
    }
  },

  /**
   * Solves homework queries and attachments in streaming mode.
   */
  solveHomeworkStream: async (data: StudyRequestData, files: HomeworkFile[] = []): Promise<AsyncIterable<{ text?: string }>> => {
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language || "English";
    const systemInstruction = `You are an expert Homework Solver and Academic Tutor. Tone: ${settings.aiTutor.personality}. You generate content only in ${language}.`;

    try {
      const res = await fetchWithWarmupRetry("/api/ai/homework-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, files, systemInstruction }),
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || !contentType.includes("text/event-stream")) {
        throw new BackendFallbackTriggerError(`Homework stream fallback (${res.status})`, res.status);
      }

      return parseSSEStream(res);
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const prompt = `
        You are an expert Homework Solver and Academic Tutor.
        
        User Information:
        - Subject: ${data.subject}
        - Class/Grade: ${data.gradeClass || "General"}
        - Board: ${data.board}
        - Language: ${language}
        - Chapter/Topic: ${data.chapterName}

        Input:
        ${data.homeworkQuery ? `Text Question/Description: "${data.homeworkQuery}"` : "No text description provided."}
        ${files.length > 0 ? `Files/Images Attached: I have attached ${files.length} file(s)/document(s)/image(s) of the homework/problem.` : "No files provided."}
        
        Requirements:
        - Carefully analyze ALL inputs (text, images, and documents).
        - Provide a clear, step-by-step solution for all identified problems.
        - Explain the underlying concepts simply so the student can learn.
        - THE ENTIRE RESPONSE MUST BE IN ${String(language).toUpperCase()}.
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

      return executeDirectGeminiStreamFallback(async (ai, model) => {
        return ai.models.generateContentStream({
          model,
          contents: { parts: contents },
          config: {
            ...buildThinkingConfig(model),
            systemInstruction,
          },
        });
      });
    }
  },

  /**
   * Generates a syllabus-aligned multiple choice quiz.
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const normalizedPayload: StudyRequestData = {
      ...data,
      subject: (data.subject || "").trim(),
      chapterName: (data.chapterName || "").trim(),
      gradeClass: (data.gradeClass || "General").trim(),
      board: (data.board || "CBSE").trim(),
      language: (data.language || "English").trim(),
      questionCount:
        Number.isFinite(Number(data.questionCount)) && Number(data.questionCount) >= 1
          ? Math.min(50, Math.round(Number(data.questionCount)))
          : 5,
      difficulty: data.difficulty || "Medium",
    };

    if (!normalizedPayload.subject) {
      throw new Error("Subject is required to generate a quiz.");
    }
    if (!normalizedPayload.chapterName) {
      throw new Error("Chapter or topic name is required to generate a quiz.");
    }

    const count = normalizedPayload.questionCount || 5;
    const timeoutMs = count >= 20 ? 80000 : 60000;

    try {
      const res = await fetchWithWarmupRetry(
        "/api/ai/quiz",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: normalizedPayload }),
        },
        1,
        timeoutMs
      );

      const body = await safeReadJsonResponse(res, "Quiz Generation");
      if (!body.success) {
        throw new Error(body.error || "Failed to generate quiz");
      }
      return validateAndNormalizeQuizClient(body.questions, count);
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) {
        throw err;
      }

      // Direct @google/genai fallback if /api/ai/quiz returned 404/502/503/504 or non-JSON
      const authorLine =
        typeof normalizedPayload.author === "string" && normalizedPayload.author.trim()
          ? `\n      Author/Textbook Reference: ${normalizedPayload.author.trim()}`
          : "";

      const prompt = `
      Create an academic multiple-choice quiz with EXACTLY ${count} questions based on the details below.
      EVERYTHING INCLUDING QUESTIONS, OPTIONS, AND EXPLANATIONS MUST BE WRITTEN STRICTLY IN ${normalizedPayload.language.toUpperCase()}.

      Requirements:
      - Difficulty level: ${normalizedPayload.difficulty} (appropriate for ${normalizedPayload.gradeClass} under ${normalizedPayload.board}).
      - Return a valid JSON array of EXACTLY ${count} question objects.
      - Each question MUST have 4 distinct, non-empty options in the "options" array.
      - "correctAnswerIndex" MUST be the zero-based integer index (0, 1, 2, or 3) of the single correct option.
      - Randomize the position of the correct answer across questions (do not always put the answer at index 0).
      - "explanation" MUST clearly and concisely explain why the correct option is right.

      Subject: ${normalizedPayload.subject}
      Chapter: ${normalizedPayload.chapterName}
      Class: ${normalizedPayload.gradeClass}
      Board: ${normalizedPayload.board}
      Language: ${normalizedPayload.language}${authorLine}
    `;

      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildThinkingConfig(model),
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
        const parsed = safeParseJsonClient<any>(response.text);
        return validateAndNormalizeQuizClient(parsed, count);
      });
    }
  },

  /**
   * Generates an exam preparation timetable.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

    try {
      const res = await fetchWithWarmupRetry("/api/ai/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examDate, subjects, hoursPerDay, language }),
      });

      const body = await safeReadJsonResponse(res, "Study Timetable");
      if (!body.success) {
        throw new Error(body.error || "Failed to generate timetable");
      }
      return body.timetable || [];
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const today = new Date().toDateString();
      const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;
      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildThinkingConfig(model),
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
        if (response.text) return safeParseJsonClient<TimetableEntry[]>(response.text);
        throw new Error("Failed to generate timetable");
      });
    }
  },

  /**
   * Updates an existing timetable with custom instructions.
   */
  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

    try {
      const res = await fetchWithWarmupRetry("/api/ai/timetable/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTimetable, instruction, language }),
      });

      const body = await safeReadJsonResponse(res, "Update Timetable");
      if (!body.success) {
        throw new Error(body.error || "Failed to update timetable");
      }
      return body.timetable || [];
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;
      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildThinkingConfig(model),
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
        if (response.text) return safeParseJsonClient<TimetableEntry[]>(response.text);
        throw new Error("Failed to update timetable");
      });
    }
  },

  /**
   * Single-turn chat with AI tutor (non-streaming).
   */
  chatWithTutor: async (text: string, history: any[], imagesBase64: string[] = []): Promise<string> => {
    const systemInstruction = SettingsService.getTutorSystemInstruction();

    try {
      const res = await fetchWithWarmupRetry("/api/ai/tutor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, history, imagesBase64, systemInstruction }),
      });

      const body = await safeReadJsonResponse(res, "Tutor Chat");
      if (!body.success) {
        throw new Error(body.error || "Failed to chat with tutor");
      }
      return body.text || "";
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const currentParts: any[] = [{ text: (text || "").trim() || "Hello" }];
      imagesBase64.forEach((img: string) => {
        const cleanBase64 = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        currentParts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64 } });
      });
      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: currentParts }],
          config: {
            ...buildThinkingConfig(model),
            systemInstruction,
          },
        });
        return response.text || "";
      });
    }
  },

  /**
   * Multi-turn chat with AI tutor in streaming mode.
   */
  chatWithTutorStream: async (
    text: string,
    history: any[],
    imagesBase64: string[] = [],
    extraFiles: { name: string; type: string; dataUrl: string; textContent?: string }[] = [],
    userContext?: string
  ): Promise<AsyncIterable<{ text?: string }>> => {
    const systemInstruction = SettingsService.getTutorSystemInstruction();

    try {
      const res = await fetchWithWarmupRetry("/api/ai/tutor-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          history,
          imagesBase64,
          extraFiles,
          userContext,
          systemInstruction,
        }),
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || !contentType.includes("text/event-stream")) {
        throw new BackendFallbackTriggerError(`Tutor stream fallback (${res.status})`, res.status);
      }

      return parseSSEStream(res);
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;

      const fullInstruction =
        (systemInstruction ||
          `You are SJ Tutor AI, an advanced, friendly, and motivational AI tutor. Explain concepts step-by-step with clear Markdown formatting.`) +
        (userContext ? `\n\nUser Context & Memory:\n${userContext}` : "");

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
      for (const msg of history || []) {
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

      return executeDirectGeminiStreamFallback(async (ai, model) => {
        return ai.models.generateContentStream({
          model,
          contents,
          config: {
            ...buildThinkingConfig(model),
            systemInstruction: fullInstruction,
          },
        });
      });
    }
  },

  /**
   * Validates a UPI payment screenshot.
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number): Promise<{ isValid: boolean; reason: string }> => {
    try {
      const res = await fetchWithWarmupRetry("/api/ai/validate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, planName, price }),
      });

      const body = await safeReadJsonResponse(res, "Payment Validation");
      if (!body.success) {
        throw new Error(body.error || "Failed to validate payment");
      }
      return { isValid: body.isValid, reason: body.reason };
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = matches ? matches[1] : "image/jpeg";
      const cleanData = matches ? matches[2] : imageBase64;
      const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;

      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [{ inlineData: { mimeType, data: cleanData } }, { text: prompt }],
          },
          config: {
            ...buildThinkingConfig(model),
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
        if (response.text) return safeParseJsonClient<{ isValid: boolean; reason: string }>(response.text);
        throw new Error("No response from payment validator");
      });
    }
  },

  /**
   * AI Tutor responses inside student study group chat.
   */
  askGroupAiTutor: async (groupName: string, subject: string, prompt: string): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language || "English";

    try {
      const res = await fetchWithWarmupRetry("/api/ai/group-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName, subject, prompt, language }),
      });

      const body = await safeReadJsonResponse(res, "Group AI Tutor");
      if (!body.success) {
        throw new Error(body.error || "Failed to get group tutor response");
      }
      return body.text || "";
    } catch (err: any) {
      if (!(err instanceof BackendFallbackTriggerError)) throw err;
      const systemInstruction = `You are @AI Tutor, an empathetic, smart, and encouraging academic AI assistant participating in a student study group chat named "${groupName}" focused on "${subject}". Respond in ${language}.`;
      return executeDirectGeminiFallback(async (ai, model) => {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...buildThinkingConfig(model),
            systemInstruction,
          },
        });
        return response.text || "";
      });
    }
  },

  /**
   * Creates a live bidirectional voice session using the server-side Gemini Live API bridge.
   * Low latency: 16kHz PCM input / 24kHz PCM output.
   */
  connectLiveVoiceSession: (callbacks: {
    onAudioChunk?: (base64_24k_pcm: string) => void;
    onTranscript?: (text: string) => void;
    onInterrupted?: () => void;
    onError?: (err: string) => void;
    onClose?: () => void;
  }) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/gemini/live`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.audio && callbacks.onAudioChunk) {
          callbacks.onAudioChunk(msg.audio);
        }
        if (msg.transcript && callbacks.onTranscript) {
          callbacks.onTranscript(msg.transcript);
        }
        if (msg.interrupted && callbacks.onInterrupted) {
          callbacks.onInterrupted();
        }
        if (msg.error && callbacks.onError) {
          callbacks.onError(msg.error);
        }
        if (msg.closed && callbacks.onClose) {
          callbacks.onClose();
        }
      } catch (err: any) {
        console.warn("[Live Voice WS Parse Warning]:", err);
      }
    };

    ws.onerror = (e) => {
      callbacks.onError?.(`WebSocket connection error to Gemini Live: ${(e as any)?.message || "connection failed"}`);
    };

    ws.onclose = () => {
      callbacks.onClose?.();
    };

    return {
      sendAudio: (base64_16k_pcm: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ audio: base64_16k_pcm }));
        }
      },
      sendVideoFrame: (base64_jpeg: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ video: base64_jpeg }));
        }
      },
      sendText: (text: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ text }));
        }
      },
      close: () => {
        try {
          ws.close();
        } catch (e: any) {
          console.debug("[Client Live WS close notice]:", e?.message || e);
        }
      },
    };
  },

  // Key status and refresh helpers used in Settings > System
  getKeyCount: () => cachedStatus.totalKeys,
  getKeyStatus: () => cachedStatus,
  refreshKeyPool: () => {
    fetch("/api/ai/refresh", { method: "POST", credentials: "include" })
      .then((r) => safeReadJsonResponse(r, "Refresh Key Pool"))
      .then((d) => {
        if (d?.success) cachedStatus = d;
      })
      .catch((e) => console.debug("Refresh key pool notice:", e));
    return cachedStatus.keys as any[];
  },
};
