import { Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, HomeworkFile, DifficultyLevel } from "../types";
import { SettingsService } from "./settingsService";
import { GeminiKeyManager } from "./geminiKeyManager";

// Primary recommended model for fast, high-quality reasoning and educational tutoring
export const GEMINI_MODEL = 'models/gemini-3.6-flash';

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

// Extract text output from Interaction response
const extractInteractionText = (interaction: any): string => {
  if (!interaction) return "";
  if (typeof interaction.output_text === 'string' && interaction.output_text.trim()) {
    return interaction.output_text;
  }
  if (Array.isArray(interaction.steps)) {
    for (let i = interaction.steps.length - 1; i >= 0; i--) {
      const step = interaction.steps[i];
      if (step.type === 'model_output' && Array.isArray(step.content)) {
        const textObj = step.content.find((c: any) => c.type === 'text' && c.text);
        if (textObj && textObj.text) {
          return textObj.text;
        }
      }
    }
  }
  return "";
};

// Robust JSON parser that strips markdown fences (```json ... ```) and cleans trailing chars
const parseJsonLenient = <T = any>(rawText: string): T => {
  const clean = rawText.trim();
  const jsonMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || clean.match(/([[{][\s\S]*[\]}])/);
  const target = jsonMatch ? jsonMatch[1].trim() : clean;
  return JSON.parse(target);
};

// Wraps an Interactions API stream into an AsyncIterable<{ text?: string }> for client consumption
async function* wrapInteractionStream(streamPromise: Promise<any> | any): AsyncIterable<{ text?: string }> {
  const stream = await streamPromise;
  for await (const event of stream) {
    if (event.event_type === "step.delta" && event.delta) {
      if (event.delta.type === "text" && event.delta.text) {
        yield { text: event.delta.text };
      }
    } else if (event.event_type === "error" && event.error) {
      throw new Error(event.error.message || "Interactions stream error");
    }
  }
}

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

    return GeminiKeyManager.executeWithRotation(async (ai) => {
      try {
        // Use Interactions API with models/gemini-3.6-flash
        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: promptText,
          system_instruction: sysInstruction,
        });
        const text = extractInteractionText(interaction);
        if (text) return text;
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Interactions API fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptText,
        config: { systemInstruction: sysInstruction }
      });
      return response.text || "";
    });
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

    return GeminiKeyManager.executeWithRotation(async (ai) => {
      try {
        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: prompt,
        });
        const text = extractInteractionText(interaction);
        if (text) return text;
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Note template fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      return response.text || "";
    });
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

    return GeminiKeyManager.executeWithRotation(async (ai) => {
      try {
        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: prompt,
          system_instruction: systemInstruction,
        });
        const text = extractInteractionText(interaction);
        if (text) return text;
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Notes generation fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { systemInstruction }
      });
      return response.text || "";
    });
  },

  /**
   * Generates curriculum summary stream with multi-key rotation and Interactions API.
   */
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

    return GeminiKeyManager.executeStreamWithRotation(async (ai) => {
      try {
        const stream = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: prompt,
          system_instruction: sysInstruction,
          stream: true,
        });
        return wrapInteractionStream(stream);
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Summary stream fallback to generateContentStream:", interactionErr.message);
        const response = await ai.models.generateContentStream({
          model: GEMINI_MODEL,
          contents: prompt,
          config: { systemInstruction: sysInstruction }
        });
        return response;
      }
    });
  },

  /**
   * Solves homework stream with multimodal files and text prompt using Interactions API.
   */
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

    return GeminiKeyManager.executeStreamWithRotation(async (ai) => {
      // Build multimodal interaction input
      const interactionInputs: any[] = [];
      const legacyContents: any[] = [{ text: prompt }];

      files.forEach(file => {
        const matches = file.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : file.type || 'image/jpeg';
        const cleanBase64 = matches ? matches[2] : file.dataUrl;

        interactionInputs.push({
          type: mimeType.startsWith('image/') ? 'image' : 'file',
          data: cleanBase64,
          mime_type: mimeType,
        });

        legacyContents.push({ inlineData: { mimeType, data: cleanBase64 } });
      });

      interactionInputs.push({ type: 'text', text: prompt });

      try {
        const stream = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: interactionInputs.length === 1 ? prompt : interactionInputs,
          system_instruction: sysInstruction,
          stream: true,
        });
        return wrapInteractionStream(stream);
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Homework solver fallback to generateContentStream:", interactionErr.message);
        const response = await ai.models.generateContentStream({
          model: GEMINI_MODEL,
          contents: { parts: legacyContents },
          config: { systemInstruction: sysInstruction }
        });
        return response;
      }
    });
  },

  /**
   * Generates a multi-choice quiz with schema verification and multi-key failover.
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on the following chapter details.
      EVERYTHING INCLUDING QUESTIONS, OPTIONS, AND EXPLANATIONS MUST BE IN ${language.toUpperCase()}.
      
      The difficulty level of the questions should be: ${difficulty}.
      Return the result as a strict JSON array of objects with keys: "question", "options" (array of 4 strings), "correctAnswerIndex" (0, 1, 2, or 3), and "explanation".
      Do NOT include any markdown code fences or conversational text. Return only valid JSON.
      
      IMPORTANT: Randomize the position of the correct answer for every question.
      
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || settings.learning.grade}
      Board: ${data.board}
      Language: ${language}
    `;

    return GeminiKeyManager.executeWithRotation(async (ai) => {
      try {
        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: prompt,
          response_format: {
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
        });
        const text = extractInteractionText(interaction);
        if (text) {
          return parseJsonLenient<QuizQuestion[]>(text);
        }
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Quiz interaction fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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
        return parseJsonLenient<QuizQuestion[]>(response.text);
      }
      throw new Error("Failed to parse quiz response");
    });
  },

  /**
   * Generates a study timetable with schema verification and multi-key failover.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;
    const today = new Date().toDateString();
    
    const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON array of objects with properties { "day": string, "date": string, "slots": [ { "time": string, "activity": string, "subject": string } ] }. Return only valid JSON.`;

    return GeminiKeyManager.executeWithRotation(async (ai) => {
      try {
        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: prompt,
          response_format: {
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
        });
        const text = extractInteractionText(interaction);
        if (text) return parseJsonLenient<TimetableEntry[]>(text);
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Timetable interaction fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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

      if (response.text) return parseJsonLenient<TimetableEntry[]>(response.text);
      throw new Error("Failed to generate timetable");
    });
  },

  /**
   * Updates an existing timetable according to student instructions.
   */
  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;
    
    const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}. Return ONLY valid JSON array.`;

    return GeminiKeyManager.executeWithRotation(async (ai) => {
      try {
        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: prompt,
          response_format: {
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
        });
        const text = extractInteractionText(interaction);
        if (text) return parseJsonLenient<TimetableEntry[]>(text);
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Update timetable interaction fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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
      if (response.text) return parseJsonLenient<TimetableEntry[]>(response.text);
      throw new Error("Failed to update timetable");
    });
  },

  /**
   * Initializes a chat session with the tutor system instruction.
   */
  createTutorChat: () => {
    const ai = GeminiKeyManager.getClient();
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    return ai.chats.create({
      model: GEMINI_MODEL,
      config: { systemInstruction }
    });
  },

  /**
   * One-off chat response with tutor with multi-key rotation and Interactions API.
   */
  chatWithTutor: async (text: string, history: any[], imagesBase64: string[] = []) => {
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    
    return GeminiKeyManager.executeWithRotation(async (ai) => {
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

      // Try Interactions API first
      try {
        let historyPrompt = "";
        if (history.length > 0) {
          historyPrompt = history.map(m => `${m.role === 'model' ? 'AI Tutor' : 'Student'}: ${m.text}`).join("\n") + "\n\n";
        }
        const combinedText = `${historyPrompt}Student: ${text}\nAI Tutor:`;

        const inputs: any[] = [];
        imagesBase64.forEach(img => {
          const parsed = parseDataUrl(img);
          inputs.push({
            type: "image",
            data: parsed ? parsed.data : img.replace(/^data:image\/[a-zA-Z]+;base64,/, ""),
            mime_type: parsed ? parsed.mimeType : "image/jpeg"
          });
        });
        inputs.push({ type: "text", text: combinedText });

        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: inputs.length === 1 ? combinedText : inputs,
          system_instruction: systemInstruction
        });
        const out = extractInteractionText(interaction);
        if (out) return out;
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Chat interaction fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [...formattedHistory, { role: 'user', parts: currentParts }],
        config: { systemInstruction }
      });

      return response.text || "";
    });
  },

  /**
   * Main real-time streaming tutor chat with multi-turn memory, file context, and multi-key failover.
   */
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

    // Prepare history transcript and multimodal parts
    let historyContext = "";
    if (history.length > 0) {
      historyContext = history.map(m => `${m.role === 'model' ? 'AI Tutor' : 'Student'}: ${m.text || ''}`).join("\n") + "\n\n";
    }

    // Append context from attached files
    let fileContext = '';
    const interactionMultimodalParts: any[] = [];
    const legacyContentsParts: any[] = [];

    extraFiles.forEach(f => {
      if (f.textContent) {
        fileContext += `\n[Attached File: ${f.name}]\nType: ${f.type}\nContent:\n${f.textContent}\n`;
      } else if (f.dataUrl) {
        const parsed = parseDataUrl(f.dataUrl);
        if (parsed) {
          interactionMultimodalParts.push({
            type: parsed.mimeType.startsWith('image/') ? 'image' : 'file',
            data: parsed.data,
            mime_type: parsed.mimeType
          });
          legacyContentsParts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
        }
      }
    });

    imagesBase64.forEach(img => {
      const parsed = parseDataUrl(img);
      if (parsed) {
        interactionMultimodalParts.push({
          type: "image",
          data: parsed.data,
          mime_type: parsed.mimeType
        });
        legacyContentsParts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
      }
    });

    let finalPrompt = text ? text.trim() : "";
    if (fileContext) {
      finalPrompt = `${fileContext}\n\nUser Question:\n${finalPrompt}`;
    }
    if (!finalPrompt) {
      finalPrompt = "Please examine and explain the attached image/file step-by-step.";
    }

    const conversationPrompt = `${historyContext}Student: ${finalPrompt}\nAI Tutor:`;
    interactionMultimodalParts.push({ type: "text", text: conversationPrompt });
    legacyContentsParts.push({ text: finalPrompt });

    // Format history for generateContent fallback
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

    return GeminiKeyManager.executeStreamWithRotation(async (ai) => {
      try {
        const stream = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: interactionMultimodalParts.length === 1 ? conversationPrompt : interactionMultimodalParts,
          system_instruction: systemInstruction,
          stream: true,
        });
        return wrapInteractionStream(stream);
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Chat stream fallback to generateContentStream:", interactionErr.message);

        const response = await ai.models.generateContentStream({
          model: GEMINI_MODEL,
          contents: [...formattedHistory, { role: 'user', parts: legacyContentsParts }],
          config: { systemInstruction }
        });
        return response;
      }
    });
  },

  /**
   * Validates a payment screenshot via multimodal vision reasoning with multi-key failover.
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const parsed = parseDataUrl(imageBase64);
    const cleanData = parsed ? parsed.data : imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const mimeType = parsed ? parsed.mimeType : 'image/jpeg';

    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return strict JSON { "isValid": boolean, "reason": string }.`;

    return GeminiKeyManager.executeWithRotation(async (ai) => {
      try {
        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: [
            { type: "image", data: cleanData, mime_type: mimeType },
            { type: "text", text: prompt }
          ],
          response_format: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ["isValid", "reason"]
          }
        });
        const text = extractInteractionText(interaction);
        if (text) {
          return parseJsonLenient<{ isValid: boolean; reason: string }>(text);
        }
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Payment screenshot interaction fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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
      if (response.text) return parseJsonLenient<{ isValid: boolean; reason: string }>(response.text);
      throw new Error("Failed to analyze payment receipt");
    });
  },

  /**
   * Group study AI tutor response with multi-key failover and Interactions API.
   */
  askGroupAiTutor: async (groupName: string, subject: string, prompt: string) => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language || "English";

    const systemInstruction = `You are @AI Tutor, an empathetic, smart, and encouraging academic AI assistant participating in a student study group chat named "${groupName}" focused on "${subject}".
    Your responses should be concise, helpful, friendly, and formatted nicely with clear explanations or bullet points. Keep it engaging like a group message. Respond in ${language}.
    If a user asks you to create, generate, or draw an image or picture, you MUST output a special markdown command in this exact format on a new line: <GENERATE_IMAGE: "detailed prompt for the image here">`;

    return GeminiKeyManager.executeWithRotation(async (ai) => {
      try {
        const interaction = await ai.interactions.create({
          model: GEMINI_MODEL,
          input: prompt,
          system_instruction: systemInstruction
        });
        const text = extractInteractionText(interaction);
        if (text) return text;
      } catch (interactionErr: any) {
        if (GeminiKeyManager.isRateLimitError(interactionErr)) throw interactionErr;
        console.warn("[GeminiService] Group tutor fallback to generateContent:", interactionErr.message);
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { systemInstruction }
      });
      return response.text || "I'm here to help with your group study! What question do you have?";
    });
  },

  /**
   * Real-time server-side image generation.
   */
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
