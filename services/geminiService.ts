
import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate } from "../types";
import { SettingsService } from "./settingsService";

export const GeminiService = {
  /**
   * Model: gemini-flash-latest (Gemini 1.5 Flash)
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const taskPrompts = {
      summarize: "Create a bulleted 'Revision Box' summary for the following note. Focus on key definitions and dates.",
      simplify: "Rewrite this note in very simple English so a younger student can understand it perfectly.",
      mcq: "Generate 5 high-quality Multiple Choice Questions with answers based ONLY on this note content. Return as Markdown list.",
      translate: `Translate this note professionally into ${targetLang || 'Hindi'}, maintaining academic terminology.`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `${taskPrompts[task]}\n\nNOTE CONTENT:\n${content}`,
      config: {
        systemInstruction: "You are an AI study assistant specializing in academic clarity."
      }
    });

    return response.text;
  },

  /**
   * Model: gemini-flash-latest (Gemini 1.5 Flash)
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a structured academic template for: Subject: ${subject}, Chapter: ${chapter}, Type: ${templateType}. Use Markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    return response.text;
  },

  /**
   * Model: gemini-flash-latest (Gemini 1.5 Flash)
   */
  generateSummaryStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
      Create a comprehensive, structured summary for:
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings.learning.grade}
      Education Board: ${data.board || settings.learning.board}
      Chapter: ${data.chapterName}
      Language: ${language}
      
      Ensure the content is strictly relevant to the ${data.board || settings.learning.board} curriculum for ${data.gradeClass || settings.learning.grade}.
    `;

    return await ai.models.generateContentStream({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert tutor for the ${data.board || settings.learning.board} curriculum.`,
      }
    });
  },

  /**
   * Model: gemini-flash-latest (Gemini 1.5 Flash)
   */
  generateEssayStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
      Write a detailed academic essay for:
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings.learning.grade}
      Education Board: ${data.board || settings.learning.board}
      Chapter: ${data.chapterName}
      Language: ${language}
      
      Follow the standards of the ${data.board || settings.learning.board} board.
    `;

    return await ai.models.generateContentStream({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        systemInstruction: `You are an academic writer for ${data.board || settings.learning.board} students.`,
      }
    });
  },

  /**
   * Model: imagen-4.0-generate-001
   */
  generateImage: async (promptText: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Academic educational illustration for: ${promptText}. Professional, clean style.`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });

      if (response.generatedImages?.[0]?.image?.imageBytes) {
        return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
      }
    } catch (error) {
      console.error("Image generation error:", error);
    }
    return null;
  },

  /**
   * Model: gemini-flash-latest (Gemini 1.5 Flash)
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question MCQ quiz for:
      Subject: ${data.subject}
      Class: ${data.gradeClass || settings.learning.grade}
      Board: ${data.board || settings.learning.board}
      Difficulty: ${difficulty}
      Chapter: ${data.chapterName}
      
      Return as a JSON array.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
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
    throw new Error("Quiz generation failed.");
  },

  /**
   * Model: gemini-flash-latest (Gemini 1.5 Flash)
   */
  createTutorChat: () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    return ai.chats.create({
      model: 'gemini-flash-latest',
      config: { systemInstruction: systemInstruction }
    });
  },

  /**
   * Model: gemini-flash-latest (Gemini 1.5 Flash)
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a study timetable up to ${examDate} for subjects: ${subjects}. Hours/Day: ${hoursPerDay}. JSON format.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
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
    throw new Error("Timetable generation failed.");
  },

  /**
   * Model: gemini-flash-latest (Gemini 1.5 Flash)
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}. Return JSON {isValid, reason}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
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
    throw new Error("Validation failed.");
  }
};
