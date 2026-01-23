
import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry } from "../types";
import { SettingsService } from "./settingsService";

// User provided API Key as fallback
const API_KEY = process.env.API_KEY || "AIzaSyAr-bTwUtZaBsziyPy939q4ObqY4sxltu4";

// Model configuration with fallback
const MODELS = {
  primary: 'gemini-3-flash-preview',
  fallback: 'gemini-2.0-flash-exp', 
  image: 'gemini-2.5-flash-image'
};

// Helper for retry logic with exponential backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = (error?.message || JSON.stringify(error)).toLowerCase();
    
    // Check for common retryable errors
    const isRetryable = 
      msg.includes('429') || 
      msg.includes('resource_exhausted') || 
      msg.includes('quota') ||
      msg.includes('503') ||
      msg.includes('service unavailable');

    if (retries > 0 && isRetryable) {
      console.warn(`API Busy/Quota hit. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Helper to attempt generation with primary model, then fallback
async function withModelFallback<T>(
  operation: (model: string) => Promise<T>
): Promise<T> {
  try {
    // Try primary model with 3 retries
    return await retryWithBackoff(() => operation(MODELS.primary), 3, 1000);
  } catch (error: any) {
    const msg = (error?.message || "").toLowerCase();
    // If it's a quota/availability issue, try fallback model
    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted')) {
      console.warn(`Primary model (${MODELS.primary}) exhausted. Switching to fallback (${MODELS.fallback})...`);
      return await retryWithBackoff(() => operation(MODELS.fallback), 3, 1500);
    }
    throw error;
  }
}

/**
 * Service to interact with Google Gemini API for academic content generation.
 */
export const GeminiService = {
  /**
   * Generates a summary for a specific chapter.
   */
  generateSummaryStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
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

    return withModelFallback((model) => 
      ai.models.generateContentStream({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: `You are an expert academic tutor. Personality: ${settings.aiTutor.personality}.`,
        }
      })
    );
  },

  /**
   * Generates an essay based on the chapter.
   */
  generateEssayStream: async (data: StudyRequestData) => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
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

    return withModelFallback((model) => 
      ai.models.generateContentStream({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: `You are an academic essay writer. Tone: ${settings.aiTutor.personality}.`,
        }
      })
    );
  },

  /**
   * Generates a relevant image based on content description.
   */
  generateImage: async (promptText: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    try {
      // Images use a specialized model, so we stick to retryWithBackoff without model switching
      const response = await retryWithBackoff(() => ai.models.generateContent({
        model: MODELS.image,
        contents: {
          parts: [{ text: `A high-quality, academic-style educational illustration for an essay about: ${promptText}. The style should be professional, clear, and informative.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      }), 4, 1500); // More aggressive retries for image model

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (error) {
      console.error("Image generation error:", error);
    }
    return null;
  },

  /**
   * Generates a quiz in JSON format.
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const settings = SettingsService.getSettings();
    
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on the following chapter details.
      The difficulty level of the questions should be: ${difficulty}.
      Return the result as a JSON array.
      
      IMPORTANT: Randomize the position of the correct answer for every question. Do not follow a pattern. ensure the correct answer is distributed across options A, B, C, and D randomly.
      
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || settings.learning.grade}
      Board: ${data.board}
    `;

    const response = await withModelFallback((model) => 
      ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctAnswerIndex: { 
                  type: Type.INTEGER,
                  description: "Zero-based index of the correct option (0-3)"
                },
                explanation: { type: Type.STRING, description: "Explanation of why the answer is correct" }
              },
              required: ["question", "options", "correctAnswerIndex", "explanation"]
            }
          }
        }
      })
    );

    if (response.text) {
      try {
        return JSON.parse(response.text.trim()) as QuizQuestion[];
      } catch (e) {
        console.error("JSON Parse Error in Quiz:", e);
        throw new Error("Failed to parse quiz data.");
      }
    }
    throw new Error("Failed to generate quiz data");
  },

  /**
   * Generates a study timetable.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const today = new Date().toDateString();
    const prompt = `
      Current Date: ${today}.
      Goal: Create a study timetable starting from tomorrow up to the exam date: ${examDate}.
      Subjects to cover: ${subjects}.
      Daily study limit: ${hoursPerDay} hours.
      
      Requirements:
      1. Create a structured plan for each day.
      2. If the exam is more than 2 weeks away, provide a detailed plan for the next 14 days only.
      3. Balance subjects and include revision slots.
      4. Output strict JSON.
    `;

    const response = await withModelFallback((model) => 
      ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING, description: "Day of the week (e.g., Monday)" },
                date: { type: Type.STRING, description: "Date string (YYYY-MM-DD)" },
                slots: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING, description: "Time range (e.g. 10:00 AM - 11:00 AM)" },
                      activity: { type: Type.STRING, description: "Specific topic or activity" },
                      subject: { type: Type.STRING, description: "Subject category" }
                    },
                    required: ["time", "activity", "subject"]
                  }
                }
              },
              required: ["day", "date", "slots"]
            }
          }
        }
      })
    );

    if (response.text) {
      try {
        return JSON.parse(response.text.trim()) as TimetableEntry[];
      } catch (e) {
        console.error("JSON Parse Error in Timetable:", e);
        throw new Error("Failed to parse timetable data. Please try again.");
      }
    }
    throw new Error("Failed to generate timetable");
  },

  /**
   * Updates an existing study timetable based on user instructions.
   */
  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const prompt = `
      You are an intelligent study planner.
      
      Current Timetable (JSON):
      ${JSON.stringify(currentTimetable)}
      
      User's Request to Edit:
      "${instruction}"
      
      Task:
      1. Modify the timetable according to the user's request.
      2. Keep the same structure (Day, Date, Slots).
      3. Ensure the schedule remains logical (no overlapping times, reasonable breaks if implied).
      4. Output strict JSON only.
    `;

    const response = await withModelFallback((model) => 
      ai.models.generateContent({
        model: model,
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
      })
    );

    if (response.text) {
      try {
        return JSON.parse(response.text.trim()) as TimetableEntry[];
      } catch (e) {
        console.error("JSON Parse Error in Timetable Update:", e);
        throw new Error("Failed to update timetable data.");
      }
    }
    throw new Error("Failed to generate updated timetable");
  },

  /**
   * Creates a chat session for the AI Tutor.
   */
  createTutorChat: () => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const settings = SettingsService.getSettings();
    
    // Chat uses the primary model directly to maintain session consistency,
    // but relies on the improved retryWithBackoff if connection fails initially.
    return ai.chats.create({
      model: MODELS.primary,
      config: {
        systemInstruction: SettingsService.getTutorSystemInstruction(),
      }
    });
  },

  /**
   * Analyzes a payment screenshot to verify the transaction.
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    
    const prompt = `
      Analyze this image. It is submitted as proof of payment for a subscription plan "${planName}".
      
      Mandatory Verification Checks:
      1. **Transaction Status**: Must be SUCCESSFUL or COMPLETED.
      2. **Amount**: Must be exactly ₹${price}.
      3. **Payee Name**: The payment MUST be made to "SHIVABASAVARAJ SADASHIVAPPA JYOTI" (or "Shivabasavaraj Jyoti"). 
         The name MUST appear in the screenshot as the receiver.
      
      If ANY of these 3 checks fail, set isValid to false.
      
      Return a JSON object with:
      - isValid: boolean (true ONLY if all 3 checks pass)
      - reason: string (Specific explanation of what matched or failed. E.g. "Name mismatch: found X instead of SHIVABASAVARAJ...", "Amount mismatch: found 100 instead of ${price}")
    `;

    // Payment validation is critical, so we stick to primary model but retry aggressively
    const response = await retryWithBackoff(() => ai.models.generateContent({
      model: MODELS.primary,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
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
    }));

    if (response.text) {
      try {
        return JSON.parse(response.text.trim());
      } catch (e) {
        return { isValid: false, reason: "Failed to parse AI response" };
      }
    }
    throw new Error("Failed to analyze image");
  }
};
