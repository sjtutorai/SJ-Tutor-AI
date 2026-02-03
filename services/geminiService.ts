
import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate } from "../types";
import { SettingsService } from "./settingsService";

/**
 * Service to interact with Google Gemini API for academic content generation.
 * Follows strict guidelines: Creates new instance per call and uses process.env.API_KEY.
 */
export const GeminiService = {
  /**
   * Helper to initialize AI client.
   */
  getAI: () => new GoogleGenAI({ apiKey: process.env.API_KEY }),

  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    const ai = GeminiService.getAI();
    const taskPrompts = {
      summarize: "Create a bulleted 'Revision Box' summary for the following note. Focus on key definitions and dates.",
      simplify: "Rewrite this note in very simple English so a younger student can understand it perfectly.",
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

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const ai = GeminiService.getAI();
    const prompt = `Create a highly structured academic template for a study note.\nSubject: ${subject}\nChapter: ${chapter}\nTemplate Type: ${templateType}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  },

  /**
   * Generates a summary for a specific chapter in streaming mode.
   */
  generateSummaryStream: async (data: StudyRequestData) => {
    const ai = GeminiService.getAI();
    const settings = SettingsService.getSettings();
    const summaryType = data.summaryType || 'Detailed';
    const specificInstruction = summaryType === 'Brief' 
      ? "Keep it extremely concise. Focus only on core concepts." 
      : summaryType === 'Paragraph' 
        ? "Write in continuous, well-structured paragraphs. No bullet points." 
        : "Create a comprehensive, detailed summary with bullet points.";

    const prompt = `Task: Create a ${summaryType} Summary.\nInstruction: ${specificInstruction}\n\nSubject: ${data.subject}\nClass: ${data.gradeClass}\nBoard: ${data.board}\nChapter: ${data.chapterName}`;

    return await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert academic tutor. Style: ${settings.aiTutor.explanationStyle}.`,
      }
    });
  },

  /**
   * Generates an essay in streaming mode.
   */
  generateEssayStream: async (data: StudyRequestData) => {
    const ai = GeminiService.getAI();
    const prompt = `Write a detailed, academic essay.\n\nSubject: ${data.subject}\nClass: ${data.gradeClass}\nBoard: ${data.board}\nChapter: ${data.chapterName}`;
    return await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: "You are an academic essay writer." }
    });
  },

  /**
   * Generates a relevant image based on content.
   */
  generateImage: async (promptText: string): Promise<string | null> => {
    const ai = GeminiService.getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `High-quality educational illustration: ${promptText}` }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    } catch (error) { console.error("Image generation error:", error); }
    return null;
  },

  /**
   * Generates a quiz in JSON format.
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = GeminiService.getAI();
    const count = data.questionCount || 5;
    const prompt = `Create a ${count}-question MCQ quiz.\nSubject: ${data.subject}\nChapter: ${data.chapterName}\nDifficulty: ${data.difficulty}`;

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

  /**
   * Generates a study timetable.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const ai = GeminiService.getAI();
    const prompt = `Create a study timetable until ${examDate} for: ${subjects}. Daily limit: ${hoursPerDay} hours. Output JSON.`;
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

  /**
   * Creates a chat session for the AI Tutor with context.
   */
  createTutorChat: (context?: StudyRequestData) => {
    const ai = GeminiService.getAI();
    let systemInstruction = SettingsService.getTutorSystemInstruction();
    if (context && context.subject) {
      systemInstruction += `\n\nCURRENT ACADEMIC CONTEXT:\nSubject: ${context.subject}\nGrade: ${context.gradeClass}\nBoard: ${context.board}\nChapter: ${context.chapterName}`;
    }
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: systemInstruction }
    });
  },

  /**
   * Analyzes a payment screenshot.
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const ai = GeminiService.getAI();
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const prompt = `Analyze image for plan "${planName}". Checks: SUCCESS, Amount ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;
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
