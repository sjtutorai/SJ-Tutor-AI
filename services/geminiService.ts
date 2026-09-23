import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, HomeworkFile, DifficultyLevel } from "../types";
import { SettingsService } from "./settingsService";

export interface KeySlot {
  id: string; // e.g. "GEMINI_API_KEY_1", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"
  key: string;
  masked: string;
  status: 'ACTIVE' | 'HIGH_DEMAND' | 'COOLING_DOWN' | 'INVALID';
  totalRequests: number;
  successCount: number;
  failureCount: number;
  highDemandCount: number;
  cooldownUntil: number; // epoch timestamp ms
  lastUsedAt: number;
  lastError?: string;
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

/**
 * Intelligent Multi-Key Rotation and High-Demand Failover Manager for Gemini API.
 * Automatically rotates and balances requests between GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
 * When high demand or quota limits (429, RESOURCE_EXHAUSTED, 503 Overloaded) hit GEMINI_API_KEY_1,
 * it immediately and seamlessly switches to GEMINI_API_KEY_2 and retries the operation without failing.
 */
class GeminiKeyManager {
  private slots: KeySlot[] = [];
  private keyIndex: number = 0;
  private readonly COOLDOWN_MS = 60000; // 60s cooldown when a key hits high demand

  constructor() {
    this.refreshKeys();
  }

  /**
   * Refreshes and returns the active unique key pool using GEMINI_API_KEY_1, GEMINI_API_KEY_2, and GEMINI_API_KEY_3.
   */
  public refreshKeys(): KeySlot[] {
    const rawDefinitions: { id: string; key: string | undefined }[] = [
      { id: "GEMINI_API_KEY_1", key: process.env.GEMINI_API_KEY_1 },
      { id: "GEMINI_API_KEY_2", key: process.env.GEMINI_API_KEY_2 },
      { id: "GEMINI_API_KEY_3", key: process.env.GEMINI_API_KEY_3 },
      { id: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY },
      { id: "API_KEY", key: process.env.API_KEY },
    ];

    const seenKeys = new Set<string>();
    const newSlots: KeySlot[] = [];

    for (const def of rawDefinitions) {
      const trimmed = (def.key || "").trim();
      if (
        trimmed.length > 5 &&
        trimmed !== "undefined" &&
        trimmed !== "null" &&
        !seenKeys.has(trimmed)
      ) {
        seenKeys.add(trimmed);
        const existing = this.slots.find((s) => s.key === trimmed);
        const masked =
          trimmed.length > 8
            ? `${trimmed.substring(0, 4)}...${trimmed.substring(trimmed.length - 4)}`
            : "***";

        newSlots.push({
          id: def.id,
          key: trimmed,
          masked,
          status: existing ? existing.status : 'ACTIVE',
          totalRequests: existing ? existing.totalRequests : 0,
          successCount: existing ? existing.successCount : 0,
          failureCount: existing ? existing.failureCount : 0,
          highDemandCount: existing ? existing.highDemandCount : 0,
          cooldownUntil: existing ? existing.cooldownUntil : 0,
          lastUsedAt: existing ? existing.lastUsedAt : 0,
          lastError: existing?.lastError,
        });
      }
    }

    this.slots = newSlots;
    return this.slots;
  }

  /**
   * Checks if an error is caused by high demand, rate limits, server overload, or quota exhaustion.
   */
  public isHighDemandError(err: any): boolean {
    if (!err) return false;
    const msg = String(err?.message || err?.statusText || err || "").toLowerCase();
    const status = err?.status || err?.statusCode || (err?.response && err.response.status);

    if (status === 429 || status === 503 || status === 500 || status === 502 || status === 504) {
      return true;
    }

    return (
      msg.includes("429") ||
      msg.includes("resource_exhausted") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("ratelimit") ||
      msg.includes("rate_limit") ||
      msg.includes("high demand") ||
      msg.includes("spikes in demand") ||
      msg.includes("currently experiencing") ||
      msg.includes("temporary") ||
      msg.includes("overloaded") ||
      msg.includes("model is overloaded") ||
      msg.includes("capacity") ||
      msg.includes("too many requests") ||
      msg.includes("service unavailable") ||
      msg.includes("503") ||
      msg.includes("temporarily unavailable") ||
      msg.includes("server is busy") ||
      msg.includes("try again later") ||
      msg.includes("deadline_exceeded") ||
      msg.includes("permission_denied") ||
      msg.includes("api key not valid") ||
      msg.includes("api_key_invalid")
    );
  }

  /**
   * Checks and restores any slots whose cooldown period has expired.
   */
  private checkCooldowns(): void {
    const now = Date.now();
    for (const slot of this.slots) {
      if (slot.cooldownUntil > 0 && now >= slot.cooldownUntil) {
        if (slot.status !== 'INVALID') {
          console.log(`[Gemini Rotation] 🔄 Cooldown expired for ${slot.id} (${slot.masked}). Restoring to ACTIVE rotation pool.`);
          slot.status = 'ACTIVE';
          slot.cooldownUntil = 0;
        }
      }
    }
  }

  /**
   * Retrieves the raw keys list for backwards compatibility.
   */
  public getKeys(): string[] {
    if (this.slots.length === 0) {
      this.refreshKeys();
    }
    return this.slots.map((s) => s.key);
  }

  public getKeyCount(): number {
    return this.getKeys().length;
  }

  /**
   * Returns the next healthy KeySlot in round-robin order, avoiding keys currently in high demand.
   */
  public getNextSlot(): KeySlot {
    this.refreshKeys();
    if (this.slots.length === 0) {
      throw new Error(
        "API_KEY_MISSING: Please configure at least one valid Gemini API Key (GEMINI_API_KEY_1 or GEMINI_API_KEY_2)."
      );
    }

    this.checkCooldowns();

    const healthySlots = this.slots.filter(
      (s) => s.status === 'ACTIVE' && (s.cooldownUntil === 0 || Date.now() >= s.cooldownUntil)
    );

    let chosenSlot: KeySlot;

    if (healthySlots.length > 0) {
      chosenSlot = healthySlots[this.keyIndex % healthySlots.length];
      this.keyIndex = (this.keyIndex + 1) % healthySlots.length;
    } else {
      console.warn("[Gemini Rotation] ⚠️ All keys currently in cooldown. Selecting key with earliest cooldown expiry...");
      const sorted = [...this.slots].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
      chosenSlot = sorted[0];
      chosenSlot.status = 'ACTIVE';
      chosenSlot.cooldownUntil = 0;
    }

    return chosenSlot;
  }

  /**
   * Returns the next API key in round-robin order.
   */
  public getNextKey(): string {
    return this.getNextSlot().key;
  }

  /**
   * Returns comprehensive metadata about current key rotation pool for UI / diagnostics.
   */
  public getStatus(): KeyManagerStatus {
    this.refreshKeys();
    this.checkCooldowns();
    const now = Date.now();
    const activeSlot = this.slots[this.keyIndex % (this.slots.length || 1)];

    return {
      totalKeys: this.slots.length,
      activeKeyId: activeSlot?.id || 'NONE',
      activeKeyMasked: activeSlot?.masked || '***',
      highDemandAutoSwitchEnabled: true,
      keys: this.slots.map((s) => ({
        id: s.id,
        masked: s.masked,
        status: s.status,
        totalRequests: s.totalRequests,
        successCount: s.successCount,
        failureCount: s.failureCount,
        highDemandCount: s.highDemandCount,
        inCooldown: s.cooldownUntil > now,
        cooldownRemainingSec: Math.max(0, Math.ceil((s.cooldownUntil - now) / 1000)),
      })),
    };
  }

  /**
   * Returns a GoogleGenAI instance using the next rotated key.
   */
  public getAI(specificKey?: string): GoogleGenAI {
    const apiKey = specificKey || this.getNextKey();
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  /**
   * Executes an asynchronous AI task with round-robin key rotation
   * and automatic multi-model failover across healthy keys and fallback models
   * if high demand (503, RESOURCE_EXHAUSTED, 429) spikes occur.
   */
  public async executeWithRotation<T>(
    operation: (ai: GoogleGenAI, slot: KeySlot, attempt: number, model: string) => Promise<T>,
    customModels?: string[]
  ): Promise<T> {
    this.refreshKeys();
    if (this.slots.length === 0) {
      throw new Error(
        "API_KEY_MISSING: Please configure at least one valid Gemini API Key (GEMINI_API_KEY_1 or GEMINI_API_KEY_2)."
      );
    }

    this.checkCooldowns();
    const modelsToTry = customModels || ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;

    for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
      const currentModel = modelsToTry[mIdx];
      const totalSlots = this.slots.length;
      const initialSlot = this.getNextSlot();
      const startIndex = Math.max(0, this.slots.findIndex((s) => s.key === initialSlot.key));

      for (let attempt = 0; attempt < totalSlots; attempt++) {
        const slotIndex = (startIndex + attempt) % totalSlots;
        const currentSlot = this.slots[slotIndex];

        if (currentSlot.status === 'INVALID' && totalSlots > 1) {
          continue;
        }

        const ai = new GoogleGenAI({
          apiKey: currentSlot.key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        try {
          currentSlot.totalRequests++;
          currentSlot.lastUsedAt = Date.now();

          const result = await operation(ai, currentSlot, attempt + 1, currentModel);

          // Success recorded
          currentSlot.status = 'ACTIVE';
          currentSlot.successCount++;
          currentSlot.cooldownUntil = 0;

          if (mIdx > 0 || attempt > 0) {
            console.log(
              `[Gemini Rotation & Fallback] ✅ Successfully fulfilled request using model "${currentModel}" on ${currentSlot.id} (${currentSlot.masked}).`
            );
          }

          return result;
        } catch (err: any) {
          lastError = err;
          currentSlot.failureCount++;
          currentSlot.lastError = String(err?.message || err || "");

          const isHighDemand = this.isHighDemandError(err);
          if (isHighDemand) {
            currentSlot.status = 'HIGH_DEMAND';
            currentSlot.highDemandCount++;
            currentSlot.cooldownUntil = Date.now() + this.COOLDOWN_MS;

            const nextIndex = (slotIndex + 1) % totalSlots;
            const nextSlot = this.slots[nextIndex];

            console.warn(
              `[Gemini Rotation] ⚠️ High Demand on model "${currentModel}" (${currentSlot.id}). ` +
              (attempt + 1 < totalSlots ? `Rotating to next key ${nextSlot.id}...` : `All keys tried for this model.`)
            );
          } else {
            console.warn(
              `[Gemini Rotation] Key ${currentSlot.id} encountered an error: ${currentSlot.lastError.substring(0, 100)}. ` +
              (attempt + 1 < totalSlots ? `Rotating to next key...` : `All keys in rotation pool tried.`)
            );
          }
        }
      }

      // If high demand occurred and another fallback model is available, switch models!
      if (mIdx < modelsToTry.length - 1 && this.isHighDemandError(lastError)) {
        const nextModel = modelsToTry[mIdx + 1];
        console.warn(
          `[Gemini Model Fallback] 🔄 Automatic failover: switching from ${currentModel} to ${nextModel} due to temporary server load...`
        );
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    throw lastError || new Error("All configured Gemini API keys and models experienced high demand. Please try again shortly.");
  }

  /**
   * Executes streaming operations with intelligent high-demand detection and automatic model/key failover.
   * If the primary model hits temporary high demand spikes, it seamlessly initiates the stream
   * on the backup model so the student never experiences a drop in service.
   */
  public async executeStreamWithRotation<T extends AsyncIterable<any>>(
    streamBuilder: (ai: GoogleGenAI, slot: KeySlot, attempt: number, model: string) => Promise<T>,
    customModels?: string[]
  ): Promise<AsyncIterable<any>> {
    const modelsToTry = customModels || ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    async function* resilientGenerator() {
      let lastError: any = null;
      let hasYielded = false;

      for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
        const currentModel = modelsToTry[mIdx];
        self.refreshKeys();
        const totalSlots = Math.max(1, self.slots.length);
        const startSlot = self.getNextSlot();
        const startIndex = Math.max(0, self.slots.findIndex((s) => s.key === startSlot.key));

        for (let attempt = 0; attempt < totalSlots; attempt++) {
          const slot = self.slots[(startIndex + attempt) % totalSlots];
          if (slot.status === 'INVALID' && totalSlots > 1) continue;

          const ai = new GoogleGenAI({
            apiKey: slot.key,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          try {
            slot.totalRequests++;
            slot.lastUsedAt = Date.now();

            const stream = await streamBuilder(ai, slot, attempt + 1, currentModel);

            for await (const chunk of stream) {
              hasYielded = true;
              yield chunk;
            }

            // Successfully finished streaming
            slot.status = 'ACTIVE';
            slot.successCount++;
            slot.cooldownUntil = 0;
            return;
          } catch (err: any) {
            lastError = err;
            slot.failureCount++;
            slot.lastError = String(err?.message || err || "");

            const isHighDemand = self.isHighDemandError(err);
            if (isHighDemand) {
              slot.status = 'HIGH_DEMAND';
              slot.highDemandCount++;
              slot.cooldownUntil = Date.now() + self.COOLDOWN_MS;
            }

            console.warn(
              `[Gemini Resilient Stream] Notice on model "${currentModel}" (${slot.id}): ${err?.message || err}`
            );

            // If we have already started printing text to the screen, we cannot restart without duplicate text
            if (hasYielded) {
              throw err;
            }

            if (attempt < totalSlots - 1) {
              continue;
            }
          }
        }

        // If high demand occurred before streaming started, switch to fallback model!
        if (mIdx < modelsToTry.length - 1 && self.isHighDemandError(lastError)) {
          const fallbackModel = modelsToTry[mIdx + 1];
          console.warn(
            `[Gemini Resilient Stream] 🔄 Model "${currentModel}" is experiencing high demand. Seamlessly falling back to "${fallbackModel}"...`
          );
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      throw lastError || new Error("This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again in a moment.");
    }

    return resilientGenerator();
  }
}

export const keyManager = new GeminiKeyManager();

// Helper to initialize AI client with key rotation
export const getAI = () => {
  return keyManager.getAI();
};

// Helper to parse base64 dataUrl accurately
const parseDataUrl = (str: string) => {
  if (!str) return null;
  if (str.startsWith("data:")) {
    const parts = str.split(";base64,");
    if (parts.length === 2) {
      const mimeType = parts[0].replace("data:", "");
      return { mimeType, data: parts[1] };
    }
  }
  return null;
};

export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const settings = SettingsService.getSettings();
      const language = targetLang || settings.learning.language;

      const taskPrompts = {
        summarize: `Create a bulleted 'Revision Box' summary for the following note in ${language}. Focus on key definitions and dates.`,
        simplify: `Rewrite this note in very simple ${language} so a younger student can understand it perfectly.`,
        mcq: `Generate 5 high-quality Multiple Choice Questions with answers in ${language} based ONLY on this note content. Return as Markdown list.`,
        translate: `Translate this note professionally into ${language}, maintaining academic terminology where appropriate.`
      };

      const response = await ai.models.generateContent({
        model,
        contents: `${taskPrompts[task]}\n\nNOTE CONTENT:\n${content}`,
        config: {
          systemInstruction: `You are an AI study assistant. You must communicate and generate content strictly in ${language}.`
        }
      });

      return response.text;
    });
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const settings = SettingsService.getSettings();
      const language = settings.learning.language;
      
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
        - ALL TEXT MUST BE IN ${language.toUpperCase()}.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      return response.text;
    });
  },

  /**
   * Generates highly structured, curriculum-aligned notes using the SJ Tutor AI Notes Generator system prompt.
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
  }) => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const systemInstruction = `You are SJ Tutor AI Notes Generator, an expert AI teacher that creates high-quality, syllabus-aligned notes for students.`;
      
      const prompt = `
Generate notes based on:
* Class: **${params.classGrade}**
* Board: **${params.board}**
* Subject: **${params.subject}**
* Language: **${params.language}**
* Chapter: **${params.chapterName}**
* Author/Poet: **${params.author || 'None'}** (Optional)
* Maximum Characters: **${params.maxCharacters}**
* Depth / Difficulty Level: **${params.difficulty || 'Medium'}**

### Requirements
1. Follow the syllabus of **${params.board}** for **Class ${params.classGrade}**.
2. Write entirely in the selected language: ${params.language}.
3. Never exceed the specified character limit: ${params.maxCharacters} characters.
4. Keep the notes simple, student-friendly, and exam-oriented with ${params.difficulty || 'Medium'} depth.
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

# ${params.chapterName}

## Overview

## Key Concepts

## Important Definitions

## Detailed Explanation

## Important Points

## Examples (if applicable)

## Formulas / Dates / Equations (if applicable)

## Quick Revision Summary

---

## Quality Standards
* Accurate and syllabus-aligned
* Age-appropriate for Class ${params.classGrade}
* Based on ${params.board} curriculum
* Easy to revise before exams
* Well-formatted Markdown
* No unnecessary content
* No fabricated information
* Respect the maximum character limit of ${params.maxCharacters} characters.
`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
        }
      });

      return response.text;
    });
  },

  generateSummaryStream: async (data: StudyRequestData) => {
    return keyManager.executeStreamWithRotation(async (ai, _slot, _attempt, model) => {
      const settings = SettingsService.getSettings();
      const language = data.language || settings.learning.language;
      const maxChars = data.maxCharacters || 5000;
      const difficulty = data.difficulty || 'Medium';

      const prompt = `
        Create a comprehensive, syllabus-aligned, and structured study notes & summary for the following:
        THE ENTIRE NOTES/SUMMARY MUST BE WRITTEN IN ${language.toUpperCase()}.
        
        Subject: ${data.subject}
        Class/Grade: ${data.gradeClass || settings.learning.grade}
        Education Board: ${data.board}
        Language: ${language}
        Chapter/Topic: ${data.chapterName}
        ${data.author ? `Author/Poet: ${data.author}` : ''}
        Depth & Difficulty Level: ${difficulty}
        Target Character Limit: Approximately ${maxChars} characters (do not exceed ${maxChars + 500} characters).
        
        Style Preference: ${settings.aiTutor.explanationStyle}

        Please format the study notes cleanly with Markdown:
        # ${data.chapterName}
        ## Overview
        ## Key Concepts & Theory
        ## Important Definitions & Formulas
        ## Step-by-Step Explanations & Examples
        ## Quick Revision Summary & Key Takeaways
      `;

      const response = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          systemInstruction: `You are an expert academic tutor and notes creator. Personality: ${settings.aiTutor.personality}. You generate high quality, structured syllabus-aligned notes only in ${language}.`,
        }
      });

      return response;
    });
  },

  solveHomeworkStream: async (data: StudyRequestData, files: HomeworkFile[] = []) => {
    return keyManager.executeStreamWithRotation(async (ai, _slot, _attempt, model) => {
      const settings = SettingsService.getSettings();
      const language = data.language || settings.learning.language;

      const prompt = `
        You are an expert Homework Solver and Academic Tutor.
        
        User Information:
        - Subject: ${data.subject}
        - Class/Grade: ${data.gradeClass || settings.learning.grade}
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
        - THE ENTIRE RESPONSE MUST BE IN ${language.toUpperCase()}.
        
        If the inputs are unclear or do not contain educational problems, politely ask the student for more details or clearer files.
      `;

      const contents: any[] = [{ text: prompt }];
      
      // Add all files to the request
      files.forEach(file => {
        const matches = file.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : file.type || 'image/jpeg';
        const cleanBase64 = matches ? matches[2] : file.dataUrl;
        contents.push({ inlineData: { mimeType: mimeType, data: cleanBase64 } });
      });

      const response = await ai.models.generateContentStream({
        model,
        contents: {
          parts: contents
        },
        config: {
          systemInstruction: `You are an expert Homework Solver and Academic Tutor. Tone: ${settings.aiTutor.personality}. You generate content only in ${language}.`,
        }
      });

      return response;
    });
  },

  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const settings = SettingsService.getSettings();
      const language = data.language || settings.learning.language;
      const count = data.questionCount || 5;
      const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

      const prompt = `
        Create a ${count}-question multiple-choice quiz based on the following chapter details.
        EVERYTHING INCLUDING QUESTIONS, OPTIONS, AND EXPLANATIONS MUST BE IN ${language.toUpperCase()}.
        
        The difficulty level of the questions should be: ${difficulty}.
        Return the result as a JSON array.
        
        IMPORTANT: Randomize the position of the correct answer for every question.
        
        Subject: ${data.subject}
        Chapter: ${data.chapterName}
        Class: ${data.gradeClass || settings.learning.grade}
        Board: ${data.board}
        Language: ${language}
      `;

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
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctAnswerIndex", "explanation"]
            }
          }
        }
      });

      if (response.text) {
        const parsed: QuizQuestion[] = JSON.parse(response.text.trim());
        return parsed;
      }
      throw new Error("Failed to generate quiz data");
    });
  },

  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const settings = SettingsService.getSettings();
      const language = settings.learning.language;
      const today = new Date().toDateString();
      
      const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;

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
                      subject: { type: Type.STRING }
                    },
                    required: ["time", "activity", "subject"]
                  }
                }
              },
              required: ["day", "date", "slots"]
            }
          }
        }
      });

      if (response.text) return JSON.parse(response.text.trim());
      throw new Error("Failed to generate timetable");
    });
  },

  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const settings = SettingsService.getSettings();
      const language = settings.learning.language;
      
      const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;
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
                      subject: { type: Type.STRING }
                    },
                    required: ["time", "activity", "subject"]
                  }
                }
              },
              required: ["day", "date", "slots"]
            }
          }
        }
      });
      if (response.text) return JSON.parse(response.text.trim());
      throw new Error("Failed to update timetable");
    });
  },

  createTutorChat: () => {
    const ai = getAI();
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    return ai.chats.create({
      model: 'gemini-3.8-flash',
      config: { systemInstruction: systemInstruction }
    });
  },

  chatWithTutor: async (text: string, history: any[], imagesBase64: string[] = []) => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const systemInstruction = SettingsService.getTutorSystemInstruction();
      
      const formattedHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.images ? [
          ...msg.images.map((img: string) => ({
            inlineData: { mimeType: 'image/jpeg', data: img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "") }
          })),
          { text: msg.text }
        ] : [{ text: msg.text }]
      }));

      const currentParts: any[] = [{ text }];
      imagesBase64.forEach(img => {
        const cleanBase64 = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
      });

      const response = await ai.models.generateContent({
        model,
        contents: [...formattedHistory, { role: 'user', parts: currentParts }],
        config: { systemInstruction }
      });

      return response.text || "";
    });
  },

  chatWithTutorStream: async (
    text: string,
    history: any[],
    imagesBase64: string[] = [],
    extraFiles: { name: string; type: string; dataUrl: string; textContent?: string }[] = [],
    userContext?: string
  ) => {
    const systemInstruction = `You are SJ Tutor AI, an advanced, highly intelligent, friendly, and motivational AI tutor and assistant.
      
Your mission:
- Help students learn concepts deeply rather than just giving answers.
- Explain math/science/coding/humanities step-by-step.
- Show examples and real-life connections.
- Keep your tone positive, encouraging, patient, curious, and professional.
- Render beautiful Markdown with clear headings, subheadings, lists, code blocks with copy buttons, horizontal lines, tables, block quotes, and LaTeX math.
- Never show robotic statements like "Here is your answer". Be engaging!

      ${SettingsService.getTutorSystemInstruction()}` + (userContext ? `\n\nUser Context & Memory (Past Interactions):\n\n${userContext}` : '');

    // Process chat history safely
    const formattedHistory = history.map(msg => {
      const parts: any[] = [];
      if (msg.images && Array.isArray(msg.images)) {
        msg.images.forEach((img: string) => {
          const parsed = parseDataUrl(img);
          if (parsed) {
            parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
          }
        });
      }
      parts.push({ text: msg.text && msg.text.trim() ? msg.text : " " });
      return {
        role: msg.role === 'model' ? 'model' : 'user',
        parts
      };
    });

    // Build current prompt parts
    const currentParts: any[] = [];

    // Append context from attached files
    let fileContext = '';
    extraFiles.forEach(f => {
      if (f.textContent) {
        fileContext += `\n[Attached File: ${f.name}]\nType: ${f.type}\nContent:\n${f.textContent}\n`;
      } else if (f.dataUrl) {
        const parsed = parseDataUrl(f.dataUrl);
        if (parsed) {
          currentParts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
        }
      }
    });

    // Append extra base64 images passed directly
    imagesBase64.forEach(img => {
      const parsed = parseDataUrl(img);
      if (parsed) {
        currentParts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
      }
    });

    let finalPrompt = text ? text.trim() : "";
    if (fileContext) {
      finalPrompt = `${fileContext}\n\nUser Question:\n${finalPrompt}`;
    }
    if (!finalPrompt) {
      finalPrompt = "Please examine and explain the attached image/file step-by-step.";
    }

    currentParts.push({ text: finalPrompt });

    return keyManager.executeStreamWithRotation(async (ai, _slot, _attempt, model) => {
      const response = await ai.models.generateContentStream({
        model,
        contents: [...formattedHistory, { role: 'user', parts: currentParts }],
        config: { systemInstruction }
      });

      return response;
    });
  },

  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const parsed = parseDataUrl(imageBase64);
      const cleanData = parsed ? parsed.data : imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      const mimeType = parsed ? parsed.mimeType : 'image/jpeg';

      const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { mimeType, data: cleanData } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ["isValid", "reason"]
          }
        }
      });
      if (response.text) return JSON.parse(response.text.trim());
      throw new Error("Failed to analyze image");
    });
  },

  askGroupAiTutor: async (groupName: string, subject: string, prompt: string) => {
    return keyManager.executeWithRotation(async (ai, _slot, _attempt, model) => {
      const settings = SettingsService.getSettings();
      const language = settings.learning.language || "English";

      const systemInstruction = `You are @AI Tutor, an empathetic, smart, and encouraging academic AI assistant participating in a student study group chat named "${groupName}" focused on "${subject}".
      Your responses should be concise, helpful, friendly, and formatted nicely with clear explanations or bullet points. Keep it engaging like a group message. Respond in ${language}.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction }
      });

      return response.text || "I'm here to help with your group study! What question do you have?";
    });
  },

  getKeyCount: () => keyManager.getKeyCount(),
  getKeyStatus: () => keyManager.getStatus(),
  refreshKeyPool: () => keyManager.refreshKeys(),
};
