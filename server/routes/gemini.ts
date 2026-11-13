import { Router } from "express";
import { Type } from "@google/genai";
import { createDedicatedGeminiClient } from "../geminiClient";

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

  public async executeWithRotation<T>(operation: (ai: ReturnType<typeof createDedicatedGeminiClient>, model: string, slot: ServerKeySlot) => Promise<T>): Promise<T> {
    const slots = this.getSlots();
    if (slots.length === 0) {
      throw new Error("No valid Gemini API keys configured on server.");
    }

    const preferredModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    const totalSlots = slots.length;
    const startIdx = this.currentIndex % totalSlots;
    this.currentIndex = (this.currentIndex + 1) % totalSlots;
    let lastErr: any = null;

    for (let mIdx = 0; mIdx < preferredModels.length; mIdx++) {
      const currentModel = preferredModels[mIdx];
      for (let i = 0; i < totalSlots; i++) {
        const slotIdx = (startIdx + i) % totalSlots;
        const currentSlot = slots[slotIdx];
        currentSlot.requests++;

        try {
          const ai = createDedicatedGeminiClient(currentSlot.key);
          const result = await operation(ai, currentModel, currentSlot);
          currentSlot.status = "ACTIVE";
          currentSlot.cooldownUntil = 0;
          return result;
        } catch (err: any) {
          lastErr = err;
          const highDemand = this.isHighDemandError(err);
          if (highDemand) {
            currentSlot.status = "HIGH_DEMAND";
            currentSlot.highDemandCount++;
            currentSlot.cooldownUntil = Date.now() + this.COOLDOWN_MS;
            const nextSlot = slots[(slotIdx + 1) % totalSlots];
            console.warn(
              `[Server Gemini] ⚠️ High demand on ${currentSlot.id} (${currentSlot.masked}) model ${currentModel}. Trying next slot ${nextSlot.id}...`
            );
          } else {
            console.warn(`[Server Gemini] Error on ${currentSlot.id} (${currentModel}): ${err?.message || err}`);
          }

          if (i === totalSlots - 1 && mIdx === preferredModels.length - 1) {
            throw lastErr;
          }
        }
      }
    }
    throw lastErr || new Error("All Gemini keys and fallback models failed on server.");
  }

  public async executeStreamWithRotation(
    streamBuilder: (ai: ReturnType<typeof createDedicatedGeminiClient>, model: string, slot: ServerKeySlot) => Promise<any>
  ): Promise<any> {
    const slots = this.getSlots();
    if (slots.length === 0) {
      throw new Error("No valid Gemini API keys configured on server.");
    }

    const preferredModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    const totalSlots = slots.length;
    const startIdx = this.currentIndex % totalSlots;
    this.currentIndex = (this.currentIndex + 1) % totalSlots;
    let lastErr: any = null;

    for (let mIdx = 0; mIdx < preferredModels.length; mIdx++) {
      const currentModel = preferredModels[mIdx];
      for (let i = 0; i < totalSlots; i++) {
        const slotIdx = (startIdx + i) % totalSlots;
        const currentSlot = slots[slotIdx];
        currentSlot.requests++;

        try {
          const ai = createDedicatedGeminiClient(currentSlot.key);
          const stream = await streamBuilder(ai, currentModel, currentSlot);
          currentSlot.status = "ACTIVE";
          currentSlot.cooldownUntil = 0;
          return stream;
        } catch (err: any) {
          lastErr = err;
          const highDemand = this.isHighDemandError(err);
          if (highDemand) {
            currentSlot.status = "HIGH_DEMAND";
            currentSlot.highDemandCount++;
            currentSlot.cooldownUntil = Date.now() + this.COOLDOWN_MS;
          }
          if (i === totalSlots - 1 && mIdx === preferredModels.length - 1) {
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
    const { content, task, language = "English" } = req.body;
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
    const { subject, chapter, templateType, language = "English" } = req.body;
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
    const { classGrade, board, subject, language = "English", chapterName, author, maxCharacters = 4000, difficulty = "Medium" } = req.body;

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
        config: { systemInstruction },
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
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "Quiz data payload is required" });

    const language = data.language || "English";
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || "Medium";

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on the following chapter details.
      EVERYTHING INCLUDING QUESTIONS, OPTIONS, AND EXPLANATIONS MUST BE IN ${language.toUpperCase()}.
      
      The difficulty level of the questions should be: ${difficulty}.
      Return the result as a JSON array.
      
      IMPORTANT: Randomize the position of the correct answer for every question.
      
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || data.grade || "General"}
      Board: ${data.board}
      Language: ${language}
    `;

    const questions = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
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

      if (response.text) {
        return JSON.parse(response.text.trim());
      }
      throw new Error("No text response from quiz generator");
    });

    res.json({ success: true, questions });
  } catch (error: any) {
    console.error("[Server Quiz Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to generate quiz" });
  }
});

// 6. Generate Study Timetable
router.post("/timetable", async (req, res) => {
  try {
    const { examDate, subjects, hoursPerDay, language = "English" } = req.body;
    const today = new Date().toDateString();
    const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;

    const timetable = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
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
      if (response.text) return JSON.parse(response.text.trim());
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
    const { currentTimetable, instruction, language = "English" } = req.body;
    const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;

    const timetable = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
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
      if (response.text) return JSON.parse(response.text.trim());
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
    const { text, history = [], imagesBase64 = [], systemInstruction } = req.body;

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
        config: { systemInstruction },
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
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    const { data, systemInstruction } = req.body;
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
          systemInstruction: systemInstruction || `You are an expert academic tutor and notes creator. You generate high quality, structured syllabus-aligned notes only in ${language}.`,
        },
      });
    });

    for await (const chunk of stream) {
      const text = chunk.text || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("[Server Summary Stream Error]:", error);
    res.write(`data: ${JSON.stringify({ error: error?.message || "Stream failed" })}\n\n`);
    res.end();
  }
});

router.post("/homework-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    const { data, files = [], systemInstruction } = req.body;
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
          systemInstruction: systemInstruction || `You are an expert Homework Solver and Academic Tutor. You generate content only in ${language}.`,
        },
      });
    });

    for await (const chunk of stream) {
      const text = chunk.text || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("[Server Homework Stream Error]:", error);
    res.write(`data: ${JSON.stringify({ error: error?.message || "Stream failed" })}\n\n`);
    res.end();
  }
});

router.post("/tutor-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  try {
    const { text, history = [], imagesBase64 = [], extraFiles = [], userContext, systemInstruction } = req.body;

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
        config: { systemInstruction: fullInstruction },
      });
    });

    for await (const chunk of stream) {
      const chunkText = chunk.text || "";
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("[Server Tutor Stream Error]:", error);
    res.write(`data: ${JSON.stringify({ error: error?.message || "Tutor stream failed" })}\n\n`);
    res.end();
  }
});

// 10. Payment screenshot validation
router.post("/validate-payment", async (req, res) => {
  try {
    const { imageBase64, planName, price } = req.body;
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
      if (response.text) return JSON.parse(response.text.trim());
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
    const { groupName, subject, prompt, language = "English" } = req.body;
    const systemInstruction = `You are @AI Tutor, an empathetic, smart, and encouraging academic AI assistant participating in a student study group chat named "${groupName}" focused on "${subject}".
Your responses should be concise, helpful, friendly, and formatted nicely with clear explanations or bullet points. Keep it engaging like a group message. Respond in ${language}.`;

    const reply = await serverGeminiKeyManager.executeWithRotation(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction },
      });
      return response.text || "";
    });

    res.json({ success: true, text: reply });
  } catch (error: any) {
    console.error("[Server Group Tutor Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to respond in group" });
  }
});

export default router;
