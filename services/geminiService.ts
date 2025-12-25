
import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry } from "../types";

/**
 * Service to interact with Google Gemini API for academic content generation.
 */
export const GeminiService = {
  /**
   * Generates a summary for a specific chapter.
   */
  generateSummaryStream: async (data: StudyRequestData) => {
    console.log("[GeminiService] Generating Summary Stream for:", data.chapterName);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Create a comprehensive, structured summary for the following study material.
      Use clear headings, bullet points for key concepts, and a bold conclusion.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass}
      Education Board: ${data.board}
      Language: ${data.language}
      Chapter Name: ${data.chapterName}
      ${data.author ? `Author: ${data.author}` : ''}
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert academic tutor creating high-quality study summaries.",
      }
    });

    return response;
  },

  /**
   * Generates an essay based on the chapter.
   */
  generateEssayStream: async (data: StudyRequestData) => {
    console.log("[GeminiService] Generating Essay Stream for:", data.chapterName);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Write a detailed, academic essay based on the topics covered in this chapter.
      The essay should have a proper introduction, body paragraphs analyzing key themes, and a conclusion.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass}
      Board: ${data.board}
      Language: ${data.language}
      Chapter: ${data.chapterName}
      ${data.author ? `Author: ${data.author}` : ''}
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an academic essay writer. Maintain a formal and educational tone.",
      }
    });

    return response;
  },

  /**
   * Generates a relevant image based on content description.
   */
  generateImage: async (promptText: string): Promise<string | null> => {
    console.log("[GeminiService] Generating Image for:", promptText);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A high-quality, academic-style educational illustration for an essay about: ${promptText}. The style should be professional, clear, and informative.` }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log("[GeminiService] Image generated successfully.");
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (error) {
      console.error("[GeminiService] Image generation error:", error);
    }
    return null;
  },

  /**
   * Generates a quiz in JSON format.
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    console.log("[GeminiService] Generating Quiz for:", data.chapterName);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on the following chapter details.
      The difficulty level of the questions should be: ${difficulty}.
      Return the result as a JSON array.
      
      IMPORTANT: Randomize the position of the correct answer for every question. Do not follow a pattern. ensure the correct answer is distributed across options A, B, C, and D randomly.
      
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass}
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
    });

    if (response.text) {
      try {
        console.log("[GeminiService] Quiz generated and parsed successfully.");
        return JSON.parse(response.text.trim()) as QuizQuestion[];
      } catch (e) {
        console.error("[GeminiService] JSON Parse Error in Quiz:", e);
        throw new Error("Failed to parse quiz data.");
      }
    }
    throw new Error("Failed to generate quiz data");
  },

  /**
   * Generates a study timetable.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    console.log("[GeminiService] Generating Study Timetable for exam on:", examDate);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    });

    if (response.text) {
      try {
        console.log("[GeminiService] Timetable generated successfully.");
        return JSON.parse(response.text.trim()) as TimetableEntry[];
      } catch (e) {
        console.error("[GeminiService] JSON Parse Error in Timetable:", e);
        throw new Error("Failed to parse timetable data. Please try again.");
      }
    }
    throw new Error("Failed to generate timetable");
  },

  /**
   * Updates an existing study timetable based on user instructions.
   */
  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    console.log("[GeminiService] Updating Timetable with instruction:", instruction);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    if (response.text) {
      try {
        console.log("[GeminiService] Timetable updated and parsed successfully.");
        return JSON.parse(response.text.trim()) as TimetableEntry[];
      } catch (e) {
        console.error("[GeminiService] JSON Parse Error in Timetable Update:", e);
        throw new Error("Failed to update timetable data.");
      }
    }
    throw new Error("Failed to generate updated timetable");
  },

  /**
   * Creates a chat session for the AI Tutor.
   */
  createTutorChat: () => {
    console.log("[GeminiService] Creating new Tutor Chat Session.");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "You are a helpful, encouraging, and knowledgeable AI Tutor. Help the student with their questions using the Socratic method where appropriate.",
      }
    });
  },

  /**
   * Analyzes a payment screenshot to verify the transaction.
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    console.log("[GeminiService] Validating Payment Screenshot for plan:", planName);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    });

    if (response.text) {
      try {
        console.log("[GeminiService] Payment validation analysis complete.");
        return JSON.parse(response.text.trim());
      } catch (e) {
        return { isValid: false, reason: "Failed to parse AI response" };
      }
    }
    throw new Error("Failed to analyze image");
  }
};
