import { GoogleGenAI, Type } from "@google/genai";
import {
  StudyRequestData,
  QuizQuestion,
  TimetableEntry,
  NoteTemplate
} from "../types";
import { SettingsService } from "./settingsService";

/**
 * IMPORTANT:
 * Frontend (Vite / React):
 * Use import.meta.env.VITE_GEMINI_API_KEY
 *
 * Backend (Next.js API / Server):
 * Use process.env.GEMINI_API_KEY
 */

const MODEL = "gemini-1.5-flash";

const getAI = () =>
  new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY
  });

export const GeminiService = {
  /* ---------------------------------------------------
   NOTE AI PROCESSING
  --------------------------------------------------- */
  processNoteAI: async (
    content: string,
    task: "summarize" | "simplify" | "mcq" | "translate",
    targetLang?: string
  ): Promise<string> => {
    const ai = getAI();
    const settings = SettingsService.getSettings();

    const taskPrompts = {
      summarize:
        "Create a bulleted Revision Box summary focusing on definitions, dates, and keywords.",
      simplify:
        "Rewrite in very simple English (and Hindi if helpful) for younger students.",
      mcq:
        "Generate exactly 5 MCQs with answers based ONLY on the note. Use Markdown.",
      translate: `Translate professionally into ${
        targetLang || "Hindi"
      }, keeping academic terms.`
    };

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `
${taskPrompts[task]}

NOTE:
${content}
      `,
      config: {
        systemInstruction:
          "You are an AI study assistant helping students understand notes clearly."
      }
    });

    return response.text || "";
  },

  /* ---------------------------------------------------
   NOTE TEMPLATE GENERATOR
  --------------------------------------------------- */
  generateNoteTemplate: async (
    subject: string,
    chapter: string,
    templateType: NoteTemplate
  ): Promise<string> => {
    const ai = getAI();

    const prompt = `
Create a structured academic note template.

Subject: ${subject}
Chapter: ${chapter}
Template Type: ${templateType}

Rules:
- Use Markdown headings
- Use [WRITE HERE] placeholders
- Formula Sheet must use tables
- Q&A: 5 board-exam important questions
- Include Key Points & Summary
    `;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt
    });

    return response.text || "";
  },

  /* ---------------------------------------------------
   SUMMARY GENERATOR
  --------------------------------------------------- */
  generateSummary: async (data: StudyRequestData): Promise<string> => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
Create a structured study summary.

Subject: ${data.subject}
Class: ${data.gradeClass || settings.learning.grade}
Board: ${data.board}
Language: ${language}
Chapter: ${data.chapterName}
${data.author ? `Author: ${data.author}` : ""}

Use headings, bullet points, and a clear conclusion.
    `;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: `Tutor personality: ${settings.aiTutor.personality}`
      }
    });

    return response.text || "";
  },

  /* ---------------------------------------------------
   ESSAY GENERATOR
  --------------------------------------------------- */
  generateEssay: async (data: StudyRequestData): Promise<string> => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
Write a detailed academic essay.

Subject: ${data.subject}
Class: ${data.gradeClass || settings.learning.grade}
Board: ${data.board}
Language: ${language}
Chapter: ${data.chapterName}
${data.author ? `Author: ${data.author}` : ""}

Include introduction, analysis, and conclusion.
    `;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: `Tone: ${settings.aiTutor.personality}`
      }
    });

    return response.text || "";
  },

  /* ---------------------------------------------------
   QUIZ GENERATOR (STRICT JSON)
  --------------------------------------------------- */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = getAI();
    const settings = SettingsService.getSettings();

    const count = data.questionCount || 5;
    const difficulty =
      data.difficulty || settings.learning.difficulty || "Medium";

    const prompt = `
Return ONLY valid JSON.
No markdown.
No explanation.

Create ${count} MCQs.

Difficulty: ${difficulty}

Each object must contain:
question, options (array), correctAnswerIndex, explanation

Subject: ${data.subject}
Chapter: ${data.chapterName}
Class: ${data.gradeClass || settings.learning.grade}
Board: ${data.board}
    `;

    const response = await ai.models.generateContent({
      model: MODEL,
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
            required: [
              "question",
              "options",
              "correctAnswerIndex",
              "explanation"
            ]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  },

  /* ---------------------------------------------------
   STUDY TIMETABLE
  --------------------------------------------------- */
  generateStudyTimetable: async (
    examDate: string,
    subjects: string,
    hoursPerDay: number
  ): Promise<TimetableEntry[]> => {
    const ai = getAI();

    const prompt = `
Return ONLY valid JSON.

Create a study timetable until ${examDate}.
Subjects: ${subjects}
Daily hours limit: ${hoursPerDay}

Each day must include:
day, date, slots[]
    `;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "[]");
  },

  updateStudyTimetable: async (
    currentTimetable: TimetableEntry[],
    instruction: string
  ): Promise<TimetableEntry[]> => {
    const ai = getAI();

    const prompt = `
Return ONLY valid JSON.

Instruction: ${instruction}

Current Timetable:
${JSON.stringify(currentTimetable)}
    `;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "[]");
  },

  /* ---------------------------------------------------
   CHATBOT
  --------------------------------------------------- */
  createTutorChat: () => {
    const ai = getAI();
    const systemInstruction =
      SettingsService.getTutorSystemInstruction();

    return ai.chats.create({
      model: MODEL,
      config: { systemInstruction }
    });
  }
};
