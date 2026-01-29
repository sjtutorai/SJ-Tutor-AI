
import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate } from "../types";
import { SettingsService } from "./settingsService";

export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   * Model: gemini-flash-latest (1.5 Flash)
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const taskPrompts = {
      summarize: "Create a bulleted 'Revision Box' summary for the following note. Focus on key definitions and dates.",
      simplify: "Rewrite this note in very simple English (and Hindi if relevant) so a younger student can understand it perfectly.",
      mcq: "Generate 5 high-quality Multiple Choice Questions with answers based ONLY on this note content. Return as Markdown list.",
      translate: `Translate this note professionally into ${targetLang || 'Hindi'}, maintaining academic terminology where appropriate.`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `${taskPrompts[task]}\n\nNOTE CONTENT:\n${content}`,
      config: {
        systemInstruction: "You are an AI study assistant. Help students organize and understand their notes better."
      }
    });

    return response.text;
  },

  /**
   * Generates a structural template for a specific topic.
   * Model: gemini-flash-latest (1.5 Flash)
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Create a highly structured academic template for a study note.
      Subject: ${subject}
      Chapter: ${chapter}
      Template Type: ${templateType}

      Requirements:
      - Use Markdown headings (# , ##).
      - Include placeholders like [WRITE HERE].
      - For "Formula Sheet", use a table format.
      - For "Q&A", list 5 most important questions for this chapter based on standard board exams (CBSE/ICSE).
      - Include a "Key Points" and "Summary" section.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });

    return response.text;
  },

  /**
   * Model: gemini-flash-latest (1.5 Flash)
   */
  generateSummaryStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
      Create a comprehensive, structured summary for the following study material.
      Use clear headings, bullet points for key concepts, and a bold conclusion.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings.learning.grade}
      Education Board: ${data.board || settings.learning.board}
      Language: ${language}
      Chapter Name: ${data.chapterName}
      ${data.author ? `Author: ${data.author}` : ''}
      
      Ensure the difficulty and depth are exactly appropriate for the ${data.gradeClass || settings.learning.grade} ${data.board || settings.learning.board} curriculum.
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert academic tutor for the ${data.board || settings.learning.board} education system.`,
      }
    });

    return response;
  },

  /**
   * Model: gemini-flash-latest (1.5 Flash)
   */
  generateEssayStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
      Write a detailed, academic essay based on the topics covered in this chapter.
      The essay should have a proper introduction, body paragraphs analyzing key themes, and a conclusion.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings.learning.grade}
      Education Board: ${data.board || settings.learning.board}
      Language: ${language}
      Chapter: ${data.chapterName}
      ${data.author ? `Author: ${data.author}` : ''}
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        systemInstruction: `You are an academic essay writer. Follow ${data.board || settings.learning.board} academic guidelines.`,
      }
    });

    return response;
  },

  /**
   * Model: imagen-4.0-generate-001
   * Used for generating educational visuals.
   */
  generateImage: async (promptText: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A high-quality educational illustration for: ${promptText}. Professional, clean academic style, 4k resolution.`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
      }
    } catch (error) {
      console.error("Image generation error:", error);
    }
    return null;
  },

  /**
   * Model: gemini-flash-latest (1.5 Flash)
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on:
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || settings.learning.grade}
      Board: ${data.board || settings.learning.board}
      Difficulty: ${difficulty}
      
      Return as a JSON array of objects.
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
    throw new Error("Failed to generate quiz data");
  },

  /**
   * Model: gemini-flash-latest (1.5 Flash)
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
   * Model: gemini-flash-latest (1.5 Flash)
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create a study timetable up to ${examDate} for: ${subjects}. Daily limit: ${hoursPerDay} hours. JSON format.`;

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
    throw new Error("Failed to generate timetable");
  },

  /**
   * Model: gemini-flash-latest (1.5 Flash)
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;
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
    throw new Error("Failed to analyze image");
  }
};
