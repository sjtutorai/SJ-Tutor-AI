import {
  StudyRequestData,
  QuizQuestion,
  TimetableEntry,
  NoteTemplate,
  HomeworkFile,
  DifficultyLevel,
  SmartTimetable,
  SmartTimetableSession,
  DayOfWeek,
  TimetableSessionType,
} from "../types";
import { SettingsService } from "./settingsService";

export interface KeySlot {
  id: string;
  masked: string;
  status: "ACTIVE" | "HIGH_DEMAND" | "COOLING_DOWN" | "INVALID";
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
    status: "ACTIVE" | "HIGH_DEMAND" | "COOLING_DOWN" | "INVALID";
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

    const rawOptions = q.options.map((opt: unknown) =>
      typeof opt === "string" ? opt.trim() : String(opt ?? "").trim()
    );
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
      throw new Error("The request timed out while waiting for the AI server. Please click Retry.");
    }
    throw new Error("Unable to reach the AI server. Please check your connection and try again.");
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
    throw new Error(
      res.ok
        ? `${actionLabel}: Server returned an empty response. Please click Retry.`
        : `${actionLabel} failed (HTTP ${res.status}). Please click Retry.`
    );
  }
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`${actionLabel}: Non-JSON response from server (HTTP ${res.status}).`);
  }
  if (!res.ok) {
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
 * Server-Backed Gemini Service:
 * Routes all Gemini API requests (including SSE streaming and Live API WebSocket bridge)
 * through the backend server endpoints (/api/ai/* and /api/gemini/live).
 */
export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (
    content: string,
    task: "summarize" | "simplify" | "mcq" | "translate",
    targetLang?: string
  ): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = targetLang || settings.learning.language;

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
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

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

    const res = await fetchWithWarmupRetry("/api/ai/summary-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, systemInstruction }),
    });

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok || !contentType.includes("text/event-stream")) {
      const errData = await safeReadJsonResponse(res, "Summary Stream");
      throw new Error(errData?.error || `Failed to start summary stream (HTTP ${res.status})`);
    }

    return parseSSEStream(res);
  },

  /**
   * Solves homework queries and attachments in streaming mode.
   */
  solveHomeworkStream: async (
    data: StudyRequestData,
    files: HomeworkFile[] = []
  ): Promise<AsyncIterable<{ text?: string }>> => {
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language || "English";
    const systemInstruction = `You are an expert Homework Solver and Academic Tutor. Tone: ${settings.aiTutor.personality}. You generate content only in ${language}.`;

    const res = await fetchWithWarmupRetry("/api/ai/homework-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, files, systemInstruction }),
    });

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok || !contentType.includes("text/event-stream")) {
      const errData = await safeReadJsonResponse(res, "Homework Stream");
      throw new Error(errData?.error || `Failed to start homework stream (HTTP ${res.status})`);
    }

    return parseSSEStream(res);
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
  },

  /**
   * Generates an exam preparation timetable.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

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
  },

  /**
   * Updates an existing timetable with custom instructions.
   */
  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

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
  },

  /**
   * Generates a complete, conflict-free AI Smart Timetable based on the 6-step wizard inputs.
   */
  generateSmartTimetable: async (
    config: Omit<SmartTimetable, "id" | "sessions" | "createdAt" | "updatedAt" | "isActive" | "isArchived">
  ): Promise<{ sessions: SmartTimetableSession[]; aiAdvice: string; conflictWarning?: string }> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language || "English";

    const subjectColorMap: Record<string, string> = {};
    config.subjects.forEach((s) => {
      subjectColorMap[s.name.toLowerCase().trim()] = s.color || "blue";
    });

    const parseTimeMins = (t: string): number => {
      const m = String(t || "").match(/^(\d{1,2}):(\d{2})/);
      if (!m) return 8 * 60;
      const hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
      const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
      return hh * 60 + mm;
    };

    const formatTimeMins = (mins: number): string => {
      const clamped = Math.max(0, Math.min(23 * 60 + 55, Math.round(mins)));
      const hh = Math.floor(clamped / 60);
      const mm = clamped % 60;
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };

    // Validate & resolve overlaps in AI-generated sessions
    const validateAndSanitizeSessions = (rawSessions: any[]): SmartTimetableSession[] => {
      const validDays: DayOfWeek[] = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const allowedDays =
        config.availability.preferredDays.length > 0
          ? config.availability.preferredDays
          : validDays;

      const byDay: Record<string, SmartTimetableSession[]> = {};
      allowedDays.forEach((d) => {
        byDay[d] = [];
      });

      const defaultSubj = config.subjects[0]?.name || "General Study";

      for (let i = 0; i < rawSessions.length; i++) {
        const s = rawSessions[i];
        if (!s || typeof s !== "object") continue;
        const rawDay = String(s.day || "").trim() as DayOfWeek;
        const day: DayOfWeek = allowedDays.includes(rawDay)
          ? rawDay
          : allowedDays[i % allowedDays.length];

        const startMins = parseTimeMins(s.startTime || "16:00");
        let dur = Number(s.durationMinutes) || config.breakPreferences.sessionDurationMinutes || 45;
        dur = Math.max(10, Math.min(180, dur));
        let endMins = s.endTime ? parseTimeMins(s.endTime) : startMins + dur;
        if (endMins <= startMins) {
          endMins = startMins + dur;
        } else {
          dur = endMins - startMins;
        }

        const rawType = String(s.sessionType || "Study").trim();
        const validTypes: TimetableSessionType[] = ["Study", "Revision", "Practice", "Break", "Assessment"];
        const sessionType: TimetableSessionType = validTypes.includes(rawType as TimetableSessionType)
          ? (rawType as TimetableSessionType)
          : "Study";

        const subjectName =
          sessionType === "Break"
            ? "Break & Recharge"
            : String(s.subject || defaultSubj).trim() || defaultSubj;

        const matchedColor =
          sessionType === "Break"
            ? "amber"
            : subjectColorMap[subjectName.toLowerCase()] ||
              config.subjects.find((sub) =>
                subjectName.toLowerCase().includes(sub.name.toLowerCase())
              )?.color ||
              "blue";

        byDay[day] = byDay[day] || [];
        byDay[day].push({
          id: `st_sess_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          day,
          startTime: formatTimeMins(startMins),
          endTime: formatTimeMins(endMins),
          durationMinutes: dur,
          subject: subjectName,
          topic: String(
            s.topic || (sessionType === "Break" ? "Short rest & hydration" : `${subjectName} Core Concepts`)
          ).trim(),
          sessionType,
          color: matchedColor,
          completed: false,
          notes: s.notes ? String(s.notes) : "",
          reminderOffset: "10m",
        });
      }

      // Sort each day chronologically and shift any overlapping session so two sessions never overlap
      const finalSessions: SmartTimetableSession[] = [];
      for (const day of allowedDays) {
        const dayList = (byDay[day] || []).sort(
          (a, b) => parseTimeMins(a.startTime) - parseTimeMins(b.startTime)
        );
        let cursor = -1;
        for (const sess of dayList) {
          let sM = parseTimeMins(sess.startTime);
          const dur = sess.durationMinutes;
          if (cursor >= 0 && sM < cursor) {
            sM = cursor + 5; // 5-minute buffer to prevent overlap
          }
          if (sM + dur > 23 * 60 + 30) continue; // skip if pushed past 23:30
          const eM = sM + dur;
          cursor = eM;
          finalSessions.push({
            ...sess,
            startTime: formatTimeMins(sM),
            endTime: formatTimeMins(eM),
          });
        }
      }

      return finalSessions;
    };

    const res = await fetchWithWarmupRetry(
      "/api/ai/smart-timetable",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, language }),
      },
      1,
      75000
    );

    const body = await safeReadJsonResponse(res, "Smart Timetable");
    if (!body.success) {
      throw new Error(body.error || "Failed to generate smart timetable");
    }

    const cleanSessions = validateAndSanitizeSessions(body.sessions || []);
    if (cleanSessions.length === 0) {
      throw new Error("The AI returned an empty schedule. Please adjust your availability window and retry.");
    }

    return {
      sessions: cleanSessions,
      aiAdvice:
        body.aiAdvice ||
        "Prioritize high-difficulty subjects during your peak focus hours and review key formulas before sleep.",
      conflictWarning: body.conflictWarning || undefined,
    };
  },

  /**
   * Regenerates / improves an existing SmartTimetable with a specific optimization goal.
   */
  improveSmartTimetable: async (
    current: SmartTimetable,
    optimizationGoal: string
  ): Promise<{ sessions: SmartTimetableSession[]; aiAdvice: string }> => {
    const updatedConfig = {
      name: current.name,
      gradeClass: current.gradeClass,
      board: current.board,
      planType: current.planType,
      templateId: current.templateId,
      subjects: current.subjects,
      availability: current.availability,
      breakPreferences: current.breakPreferences,
      examInfo: {
        ...current.examInfo,
        revisionRequirements: `${current.examInfo.revisionRequirements || ""} | Optimization Goal: ${optimizationGoal}`.trim(),
      },
    };
    const res = await GeminiService.generateSmartTimetable(updatedConfig);
    return {
      sessions: res.sessions,
      aiAdvice: res.aiAdvice,
    };
  },

  /**
   * Generates 2 interactive multiple-choice topic check questions + 4 topic-specific follow-up prompts
   * for the AI Tutor chat based on the student's question and the AI's explanation.
   */
  generateTutorTopicQuestions: async (
    userQuestion: string,
    aiAnswer: string,
    subject: string,
    grade: string
  ): Promise<{ practiceQuestions: QuizQuestion[]; followUpPrompts: string[] }> => {
    try {
      const res = await fetchWithWarmupRetry("/api/ai/tutor-topic-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuestion, aiAnswer, subject, grade }),
      });

      const body = await safeReadJsonResponse(res, "Tutor Topic Questions");
      if (!body.success) {
        return { practiceQuestions: [], followUpPrompts: [] };
      }
      const validPractice = validateAndNormalizeQuizClient(body.practiceQuestions || [], 2);
      const prompts = Array.isArray(body.followUpPrompts)
        ? body.followUpPrompts.filter((p: unknown) => typeof p === "string" && p.trim().length > 0).slice(0, 4)
        : [];
      return {
        practiceQuestions: validPractice,
        followUpPrompts: prompts,
      };
    } catch (err) {
      console.debug("[TutorTopicQuestions] Notice:", err);
      return {
        practiceQuestions: [],
        followUpPrompts: [],
      };
    }
  },

  /**
   * Single-turn chat with AI tutor (non-streaming).
   */
  chatWithTutor: async (text: string, history: any[], imagesBase64: string[] = []): Promise<string> => {
    const systemInstruction = SettingsService.getTutorSystemInstruction();

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
      const errData = await safeReadJsonResponse(res, "Tutor Stream");
      throw new Error(errData?.error || `Failed to start tutor stream (HTTP ${res.status})`);
    }

    return parseSSEStream(res);
  },

  /**
   * Validates a UPI payment screenshot.
   */
  validatePaymentScreenshot: async (
    imageBase64: string,
    planName: string,
    price: number
  ): Promise<{ isValid: boolean; reason: string }> => {
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
  },

  /**
   * AI Tutor responses inside student study group chat.
   */
  askGroupAiTutor: async (groupName: string, subject: string, prompt: string): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language || "English";

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
