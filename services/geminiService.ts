
import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate } from "../types";
import { SettingsService } from "./settingsService";

export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   * Model: gemini-3-flash-preview
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    
    const context = `Subject: ${settings.learning.preferredSubject}, Class: ${settings.learning.grade}, Board: ${settings.learning.board}`;
    
    const taskPrompts = {
      summarize: `Create a bulleted 'Revision Box' summary. Context: ${context}. Focus on definitions and board-relevant facts.`,
      simplify: `Rewrite in simple English for a student in ${settings.learning.grade}. Context: ${context}.`,
      mcq: `Generate 5 high-quality MCQs based on ${settings.learning.board} board patterns. Context: ${context}.`,
      translate: `Translate to ${targetLang || 'Hindi'} while keeping academic terms from the ${settings.learning.board} curriculum.`
    };

    // Use gemini-3-flash-preview for text tasks as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${taskPrompts[task]}\n\nNOTE CONTENT:\n${content}`,
      config: {
        systemInstruction: `You are an AI study assistant specializing in the ${settings.learning.board} curriculum for ${settings.learning.grade}.`
      }
    });

    return response.text;
  },

  /**
   * Generates a structural template for a specific topic.
   * Model: gemini-3-flash-preview
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    
    const prompt = `
      Create a highly structured academic template for a study note.
      Subject: ${subject}
      Chapter: ${chapter}
      Template Type: ${templateType}
      Target Class: ${settings.learning.grade}
      Education Board: ${settings.learning.board}

      Requirements:
      - Use Markdown headings.
      - Include placeholders like [WRITE HERE].
      - Align content with ${settings.learning.board} board standards.
    `;

    // Updated model to gemini-3-flash-preview
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text;
  },

  /**
   * Model: gemini-3-flash-preview
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
      Language: ${language}
      Chapter Name: ${data.chapterName}
      ${data.author ? `Author/Publisher: ${data.author}` : ''}
      
      Ensure the summary follows the depth and pattern required by the ${data.board || settings.learning.board} board for ${data.gradeClass || settings.learning.grade}.
    `;

    // Updated model to gemini-3-flash-preview
    return await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are a high-level academic summary generator specializing in the ${data.board || settings.learning.board} system.`,
      }
    });
  },

  /**
   * Model: gemini-3-flash-preview
   */
  generateEssayStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
      Write a detailed, academic essay.
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings.learning.grade}
      Education Board: ${data.board || settings.learning.board}
      Language: ${language}
      Topic/Chapter: ${data.chapterName}
      
      Structure: Introduction, Body Paragraphs, and Conclusion.
      Standard: Professional academic writing for ${data.board || settings.learning.board} Board.
    `;

    // Updated model to gemini-3-flash-preview
    return await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert essayist for school students in the ${data.board || settings.learning.board} board.`,
      }
    });
  },

  /**
   * Model: imagen-4.0-generate-001
   */
  generateImage: async (promptText: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      // Use generateImages for Imagen models as per guidelines
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A high-quality educational illustration for an academic study on: ${promptText}. Professional, clean, and textbook-style.`,
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
   * Model: gemini-3-flash-preview
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question MCQ quiz.
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || settings.learning.grade}
      Education Board: ${data.board || settings.learning.board}
      Difficulty Level: ${difficulty}
      
      Return the response strictly as a JSON array of objects.
    `;

    // Updated model to gemini-3-flash-preview
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
    throw new Error("Failed to generate quiz data.");
  },

  /**
   * Model: gemini-3-flash-preview
   */
  createTutorChat: () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    // Updated model to gemini-3-flash-preview
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: systemInstruction }
    });
  },

  /**
   * Model: gemini-3-flash-preview
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = SettingsService.getSettings();
    const prompt = `
      Create a study schedule for a student in ${settings.learning.grade} (${settings.learning.board} Board).
      Exam Date: ${examDate}.
      Subjects: ${subjects}.
      Hours/Day: ${hoursPerDay}.
      Output JSON format.
    `;

    // Updated model to gemini-3-flash-preview
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
    throw new Error("Failed to generate timetable.");
  },

  /**
   * Model: gemini-3-flash-preview
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const prompt = `Analyze this payment screenshot for the ${planName} plan. Check for: Payee SHIVABASAVARAJ SADASHIVAPPA JYOTI, Amount ₹${price}, and Status SUCCESS. Return JSON {isValid, reason}.`;
    
    // Updated model to gemini-3-flash-preview
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
    throw new Error("Payment verification failed.");
  }
};
