
import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, DifficultyLevel } from "../types";
import { SettingsService } from "./settingsService";

export const GeminiService = {
  /**
   * Suggests the best revision time and generates a friendly reminder message.
   */
  suggestSmartReminder: async (topic: string, subject: string, difficulty: DifficultyLevel = 'Medium') => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      You are an AI study assistant.
      Task 1: Suggest the best revision date/time for a note created today.
      Task 2: Create a short, friendly, non-stressful reminder message for a student.
      
      Details:
      Topic: ${topic}
      Subject: ${subject}
      Difficulty: ${difficulty}
      
      Output JSON only:
      {
        "suggestedDate": "YYYY-MM-DD",
        "suggestedTime": "HH:MM",
        "message": "Friendly encouraging message"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedDate: { type: Type.STRING },
            suggestedTime: { type: Type.STRING },
            message: { type: Type.STRING }
          },
          required: ["suggestedDate", "suggestedTime", "message"]
        }
      }
    });

    if (response.text) return JSON.parse(response.text.trim());
    return null;
  },

  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const taskPrompts = {
      summarize: "Create a bulleted 'Revision Box' summary for the following note. Focus on key definitions and dates.",
      simplify: "Rewrite this note in very simple English (and Hindi if relevant) so a younger student can understand it perfectly.",
      mcq: "Generate 5 high-quality Multiple Choice Questions with answers based ONLY on this note content. Return as Markdown list.",
      translate: `Translate this note professionally into ${targetLang || 'Hindi'}, maintaining academic terminology where appropriate.`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${taskPrompts[task]}\n\nNOTE CONTENT:\n${content}`,
      config: {
        systemInstruction: "You are an AI study assistant. Help students organize and understand their notes better."
      }
    });

    return response.text;
  },

  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a highly structured academic template for a study note. Subject: ${subject} Chapter: ${chapter} Template Type: ${templateType}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  },

  generateSummaryStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const prompt = `Create a comprehensive, structured summary for Subject: ${data.subject} Chapter: ${data.chapterName}.`;
    return await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
  },

  generateEssayStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Write a detailed, academic essay for Chapter: ${data.chapterName}.`;
    return await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
  },

  generateImage: async (promptText: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Educational illustration: ${promptText}` }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    } catch (e) { console.error(e); }
    return null;
  },

  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a ${data.questionCount || 5}-question multiple-choice quiz for Chapter: ${data.chapterName}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    if (response.text) return JSON.parse(response.text.trim());
    throw new Error("Failed to generate quiz");
  },

  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a study timetable up to ${examDate}. Subjects: ${subjects}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
  },

  createTutorChat: () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: systemInstruction }
    });
  },

  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const prompt = `Analyze this image for plan "${planName}" and price ₹${price}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
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
  }
};
