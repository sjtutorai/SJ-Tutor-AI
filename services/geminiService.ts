
import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate } from "../types";
import { SettingsService } from "./settingsService";

// Helper to initialize AI client, ensuring a fresh instance for each call.
// Added fallback key directly here as requested to ensure connectivity.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || 'AIzaSyAqaZAP5IfwJrYKFyYnQDf5_1-EB58xrrE' });

export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    const ai = getAI();
    const settings = SettingsService.getSettings();

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

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const ai = getAI();
    
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
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text;
  },

  generateSummaryStream: async (data: StudyRequestData) => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
      Create a comprehensive, structured summary for the following study material.
      Use clear headings, bullet points for key concepts, and a bold conclusion.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings.learning.grade}
      Education Board: ${data.board}
      Language: ${language}
      Chapter Name: ${data.chapterName}
      ${data.author ? `Author: ${data.author}` : ''}
      
      Style Preference: ${settings.aiTutor.explanationStyle}
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert academic tutor. Personality: ${settings.aiTutor.personality}.`,
      }
    });

    return response;
  },

  generateEssayStream: async (data: StudyRequestData) => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
      Write a detailed, academic essay based on the topics covered in this chapter.
      The essay should have a proper introduction, body paragraphs analyzing key themes, and a conclusion.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings.learning.grade}
      Board: ${data.board}
      Language: ${language}
      Chapter: ${data.chapterName}
      ${data.author ? `Author: ${data.author}` : ''}
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are an academic essay writer. Tone: ${settings.aiTutor.personality}.`,
      }
    });

    return response;
  },

  generateImage: async (promptText: string): Promise<string | null> => {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A high-quality, academic-style educational illustration for an essay about: ${promptText}. The style should be professional, clear, and informative.` }]
        },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    } catch (error) { console.error("Image generation error:", error); }
    return null;
  },

  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on the following chapter details.
      The difficulty level of the questions should be: ${difficulty}.
      Return the result as a JSON array.
      
      IMPORTANT: Randomize the position of the correct answer for every question.
      
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || settings.learning.grade}
      Board: ${data.board}
    `;

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
    throw new Error("Failed to generate quiz data");
  },

  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const ai = getAI();
    const today = new Date().toDateString();
    const prompt = `Current Date: ${today}. Goal: Create a study timetable up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;

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

  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const ai = getAI();
    const prompt = `Update the timetable based on: "${instruction}"\n\nCurrent: ${JSON.stringify(currentTimetable)}`;
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
    throw new Error("Failed to update timetable");
  },

  createTutorChat: () => {
    const ai = getAI();
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction: systemInstruction }
    });
  },

  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const ai = getAI();
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;
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
