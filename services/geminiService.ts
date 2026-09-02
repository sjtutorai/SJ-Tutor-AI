import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, HomeworkFile, DifficultyLevel } from "../types";
import { SettingsService } from "./settingsService";

// Helper to initialize AI client using official Gemini API keys.
const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING: Please configure your GEMINI_API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to parse base64 dataUrl accurately
const parseDataUrl = (str: string) => {
  if (!str) return null;
  if (str.startsWith('data:')) {
    const parts = str.split(';base64,');
    if (parts.length === 2) {
      const mimeType = parts[0].replace('data:', '');
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
    const settings = SettingsService.getSettings();
    const language = targetLang || settings.learning.language;

    const taskPrompts = {
      summarize: `Create a bulleted 'Revision Box' summary for the following note in ${language}. Focus on key definitions and dates.`,
      simplify: `Rewrite this note in very simple ${language} so a younger student can understand it perfectly.`,
      mcq: `Generate 5 high-quality Multiple Choice Questions with answers in ${language} based ONLY on this note content. Return as Markdown list.`,
      translate: `Translate this note professionally into ${language}, maintaining academic terminology where appropriate.`
    };

    const promptText = `${taskPrompts[task]}\n\nNOTE CONTENT:\n${content}`;
    const sysInstruction = `You are an AI study assistant. You must communicate and generate content strictly in ${language}.`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          systemInstruction: sysInstruction
        }
      });
      return response.text || "";
    } catch (geminiError: any) {
      console.error("[GeminiService] Note processing failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
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

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || "";
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini note template generation failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
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

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
        }
      });
      return response.text || "";
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini notes generation failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
  },

  generateSummaryStream: async (data: StudyRequestData): Promise<AsyncIterable<{ text?: string }>> => {
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

    const sysInstruction = `You are an expert academic tutor and notes creator. Personality: ${settings.aiTutor.personality}. You generate high quality, structured syllabus-aligned notes only in ${language}.`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: sysInstruction,
        }
      });
      return response;
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini summary stream failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
  },

  solveHomeworkStream: async (data: StudyRequestData, files: HomeworkFile[] = []): Promise<AsyncIterable<{ text?: string }>> => {
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

    const sysInstruction = `You are an expert Homework Solver and Academic Tutor. Tone: ${settings.aiTutor.personality}. You generate content only in ${language}.`;

    try {
      const ai = getAI();
      const contents: any[] = [{ text: prompt }];
      
      // Add all files to the request
      files.forEach(file => {
        const matches = file.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : file.type || 'image/jpeg';
        const cleanBase64 = matches ? matches[2] : file.dataUrl;
        contents.push({ inlineData: { mimeType: mimeType, data: cleanBase64 } });
      });

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: {
          parts: contents
        },
        config: {
          systemInstruction: sysInstruction,
        }
      });
      return response;
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini homework solver failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
  },

  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on the following chapter details.
      EVERYTHING INCLUDING QUESTIONS, OPTIONS, AND EXPLANATIONS MUST BE IN ${language.toUpperCase()}.
      
      The difficulty level of the questions should be: ${difficulty}.
      Return the result as a JSON array of objects with keys: "question", "options" (array of 4 strings), "correctAnswerIndex" (0, 1, 2, or 3), and "explanation".
      
      IMPORTANT: Randomize the position of the correct answer for every question.
      
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || settings.learning.grade}
      Board: ${data.board}
      Language: ${language}
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini quiz generation failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
    throw new Error("Failed to generate quiz data");
  },

  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;
    const today = new Date().toDateString();
    
    const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON array of objects with properties { "day": string, "date": string, "slots": [ { "time": string, "activity": string, "subject": string } ] }.`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini timetable generation failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
    throw new Error("Failed to generate timetable");
  },

  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;
    
    const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini update timetable failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
    throw new Error("Failed to update timetable");
  },

  createTutorChat: () => {
    const ai = getAI();
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    return ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: systemInstruction }
    });
  },

  chatWithTutor: async (text: string, history: any[], imagesBase64: string[] = []) => {
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    
    try {
      const ai = getAI();
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
        model: 'gemini-2.5-flash',
        contents: [...formattedHistory, { role: 'user', parts: currentParts }],
        config: { systemInstruction }
      });

      return response.text || "";
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini chat failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
  },

  chatWithTutorStream: async (
    text: string, 
    history: any[], 
    imagesBase64: string[] = [], 
    extraFiles: { name: string; type: string; dataUrl: string; textContent?: string }[] = [], 
    userContext?: string
  ): Promise<AsyncIterable<{ text?: string }>> => {
    const systemInstruction = `You are SJ Tutor AI, an advanced, highly intelligent, friendly, and motivational AI tutor and assistant.
      
Your mission:
- Help students learn concepts deeply rather than just giving answers.
- Explain math/science/coding/humanities step-by-step.
- Show examples and real-life connections.
- Keep your tone positive, encouraging, patient, curious, and professional.
- Render beautiful Markdown with clear headings, subheadings, lists, code blocks with copy buttons, horizontal lines, tables, block quotes, and LaTeX math.
- Never show robotic statements like "Here is your answer". Be engaging!
- If the user asks you to create, generate, or draw an image or picture, you MUST output a special markdown command in this exact format on a new line: <GENERATE_IMAGE: "detailed prompt for the image here">

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

    try {
      const ai = getAI();
      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [...formattedHistory, { role: 'user', parts: currentParts }],
        config: { systemInstruction }
      });
      return response;
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini chat stream failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
  },

  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const parsed = parseDataUrl(imageBase64);
    const cleanData = parsed ? parsed.data : imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const mimeType = parsed ? parsed.mimeType : 'image/jpeg';

    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
    } catch (geminiError: any) {
      console.error("[GeminiService] Gemini payment validation failed:", geminiError?.message || geminiError);
      throw geminiError;
    }
    throw new Error("Failed to analyze image");
  },

  askGroupAiTutor: async (groupName: string, subject: string, prompt: string) => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language || "English";

    const systemInstruction = `You are @AI Tutor, an empathetic, smart, and encouraging academic AI assistant participating in a student study group chat named "${groupName}" focused on "${subject}".
    Your responses should be concise, helpful, friendly, and formatted nicely with clear explanations or bullet points. Keep it engaging like a group message. Respond in ${language}.
    If a user asks you to create, generate, or draw an image or picture, you MUST output a special markdown command in this exact format on a new line: <GENERATE_IMAGE: "detailed prompt for the image here">`;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
      });
      return response.text || "I'm here to help with your group study! What question do you have?";
    } catch (geminiError: any) {
      console.error("[GeminiService] Group tutor response failed:", geminiError?.message || geminiError);
      return "I'm currently unable to connect to the AI model. Please check back in a moment!";
    }
  },

  generateImage: async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate image from server");
      }
      const data = await response.json();
      return data.imageUrl;
    } catch (e) {
      console.error("Image generation error:", e);
      throw e;
    }
  }
};
