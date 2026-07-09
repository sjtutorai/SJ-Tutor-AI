import { GoogleGenAI, Type } from "@google/genai";
import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, HomeworkFile } from "../types";
import { SettingsService } from "./settingsService";

// Helper to initialize AI client.
// The API key is retrieved exclusively from the environment variable process.env.API_KEY.
// This variable is mapped in vite.config.ts from your .env file or Vercel settings.
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: Please set the API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
};

export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = targetLang || settings.learning.language;

    const taskPrompts = {
      summarize: `Create a bulleted 'Revision Box' summary for the following note in ${language}. Focus on key definitions and dates.`,
      simplify: `Rewrite this note in very simple ${language} so a younger student can understand it perfectly.`,
      mcq: `Generate 5 high-quality Multiple Choice Questions with answers in ${language} based ONLY on this note content. Return as Markdown list.`,
      translate: `Translate this note professionally into ${language}, maintaining academic terminology where appropriate.`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${taskPrompts[task]}\n\nNOTE CONTENT:\n${content}`,
      config: {
        systemInstruction: `You are an AI study assistant. You must communicate and generate content strictly in ${language}.`
      }
    });

    return response.text;
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const ai = getAI();
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
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
  }) => {
    const ai = getAI();
    
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

### Requirements
1. Follow the syllabus of **${params.board}** for **Class ${params.classGrade}**.
2. Write entirely in the selected language: ${params.language}.
3. Never exceed the specified character limit: ${params.maxCharacters} characters.
4. Keep the notes simple, student-friendly, and exam-oriented.
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    return response.text;
  },

  generateSummaryStream: async (data: StudyRequestData) => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const prompt = `
      Create a comprehensive, structured summary for the following study material.
      THE ENTIRE SUMMARY MUST BE WRITTEN IN ${language.toUpperCase()}.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings.learning.grade}
      Education Board: ${data.board}
      Language: ${language}
      Chapter Name: ${data.chapterName}
      ${data.author ? `Author: ${data.author}` : ''}
      
      Style Preference: ${settings.aiTutor.explanationStyle}
    `;

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert academic tutor. Personality: ${settings.aiTutor.personality}. You generate content only in ${language}.`,
      }
    });

    return response;
  },

  solveHomeworkStream: async (data: StudyRequestData, files: HomeworkFile[] = []) => {
    const ai = getAI();
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
        systemInstruction: `You are an expert Homework Solver and Academic Tutor. Tone: ${settings.aiTutor.personality}. You generate content only in ${language}.`,
      }
    });

    return response;
  },

  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings.learning.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on the following chapter details.
      EVERYTHING INCLUDING QUESTIONS, OPTIONS, AND EXPLANATIONS MUST BE IN ${language.toUpperCase()}.
      
      The difficulty level of the questions should be: ${difficulty}.
      Return the result as a JSON array.
      
      IMPORTANT: Randomize the position of the correct answer for every question.
      
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || settings.learning.grade}
      Board: ${data.board}
      Language: ${language}
    `;

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

    if (response.text) return JSON.parse(response.text.trim());
    throw new Error("Failed to generate quiz data");
  },

  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;
    const today = new Date().toDateString();
    
    const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;

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
    throw new Error("Failed to generate timetable");
  },

  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const ai = getAI();
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;
    
    const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;
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
    const ai = getAI();
    const systemInstruction = SettingsService.getTutorSystemInstruction();
    
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
  },

  chatWithTutorStream: async (text: string, history: any[], imagesBase64: string[] = [], extraFiles: { name: string; type: string; dataUrl: string; textContent?: string }[] = []) => {
    const ai = getAI();
    const systemInstruction = `You are SJ Tutor AI, an advanced, highly intelligent, friendly, and motivational AI tutor and assistant.
      
Your mission:
- Help students learn concepts deeply rather than just giving answers.
- Explain math/science/coding/humanities step-by-step.
- Show examples and real-life connections.
- Keep your tone positive, encouraging, patient, curious, and professional.
- Render beautiful Markdown with clear headings, subheadings, lists, code blocks with copy buttons, horizontal lines, tables, block quotes, and LaTeX math.
- Never show robotic statements like "Here is your answer". Be engaging!

${SettingsService.getTutorSystemInstruction()}
`;

    // Process chat history
    const rawFormattedHistory = history.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: msg.images ? [
        ...msg.images.map((img: string) => {
          const cleanBase64 = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
          const isPdf = img.startsWith('data:application/pdf');
          const mime = isPdf ? 'application/pdf' : 'image/jpeg';
          return {
            inlineData: { mimeType: mime, data: cleanBase64 }
          };
        }),
        ...(msg.text ? [{ text: msg.text }] : [])
      ] : (msg.text ? [{ text: msg.text }] : [])
    })).filter(msg => msg.parts.length > 0);

    const formattedHistory: any[] = [];
    for (const msg of rawFormattedHistory) {
      const last = formattedHistory[formattedHistory.length - 1];
      if (last && last.role === msg.role) {
        last.parts.push(...msg.parts);
      } else {
        formattedHistory.push({ role: msg.role, parts: [...msg.parts] });
      }
    }

    // Build the current prompt parts
    const currentParts: any[] = [];

    // Append context from attached files that were read as text (TXT, CSV, code, etc.)
    let fileContext = '';
    extraFiles.forEach(f => {
      if (f.textContent) {
        fileContext += `\n[Attached File: ${f.name}]\nType: ${f.type}\nContent:\n${f.textContent}\n`;
      } else if (f.dataUrl.startsWith('data:application/pdf')) {
        // Pass PDF native base64 inline to Gemini
        const cleanBase = f.dataUrl.replace(/^data:application\/pdf;base64,/, "");
        currentParts.push({
          inlineData: { mimeType: 'application/pdf', data: cleanBase }
        });
      } else if (f.dataUrl.startsWith('data:image')) {
        // Pass Image base64 inline
        const cleanBase = f.dataUrl.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        currentParts.push({
          inlineData: { mimeType: 'image/jpeg', data: cleanBase }
        });
      }
    });

    let finalPrompt = text;
    if (fileContext) {
      finalPrompt = `${fileContext}\n\nUser Question:\n${text}`;
    }

    currentParts.push({ text: finalPrompt });

    // Handle extra base64 images passed separately
    imagesBase64.forEach(img => {
      const cleanBase64 = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
    });

    const finalContents = [...formattedHistory];
    const lastContent = finalContents[finalContents.length - 1];
    
    if (lastContent && lastContent.role === 'user') {
      lastContent.parts.push(...currentParts);
    } else {
      finalContents.push({ role: 'user', parts: currentParts });
    }

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: finalContents,
      config: { systemInstruction }
    });

    return response;
  },

  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const ai = getAI();
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
  },

  analyzeProfile: async (profile: any, email: string | null) => {
    const ai = getAI();
    const systemInstruction = "You are SJ Tutor AI, an expert academic advisor, performance analyst, and study strategist. Analyze the student's profile and generate a highly personalized, structured academic analysis and roadmap.";
    
    const prompt = `
Please analyze the following student's academic profile and provide:
1. **Academic Strength & Goal Assessment**: Assess their background, bio, and main learning goal.
2. **Customized Study Track**: Recommend study techniques and methods specifically aligned with their preferred learning style (${profile.learningStyle || 'Visual'}).
3. **Step-by-Step Strategic Roadmap**: Practical, actionable milestones for them to achieve their primary learning goal: "${profile.learningGoal || 'General academic improvement'}".
4. **Board Exam Recommendations**: Specific board preparation strategies suitable for Class ${profile.grade || '10th'} under the ${profile.board || 'CBSE'} syllabus.

Student Profile Details:
- **Full Name**: ${profile.displayName || 'Scholar'}
- **Email**: ${email || 'Not provided'}
- **Class / Grade**: ${profile.grade || 'Not specified'}
- **School Board**: ${profile.board || 'Not specified'}
- **Institution / School**: ${profile.institution || 'Not specified'}
- **Location**: ${profile.district || 'Not specified'}, ${profile.state || 'Not specified'}
- **Learning Style**: ${profile.learningStyle || 'Visual'}
- **Learning Goal**: ${profile.learningGoal || 'General academic improvement'}
- **About Me (Bio)**: ${profile.bio || 'Not provided'}

Response Format Requirements:
- Write in clean, beautiful, and inspiring Markdown formatting with headings and lists.
- Be encouraging, detailed, and highly practical.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { systemInstruction }
    });

    return response.text;
  },

  generateConversationTitle: async (messages: any[]): Promise<string> => {
    try {
      const ai = getAI();
      const textMessages = messages
        .filter(m => m.role === 'user' || m.role === 'model')
        .slice(0, 5) // Use first 5 messages for context
        .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`)
        .join('\n');
        
      const prompt = `Analyze the following brief conversation between a student and an AI Tutor, and generate a concise summarizing title.
      Requirements:
      - The title must be between 4 and 8 words.
      - Do not use generic words like "Tutor Session", "Lesson", "Help", or "Chat".
      - Focus on the specific academic topic or subject discussed.
      - Return ONLY the clean, plain title without quotes, prefixes, or markdown.

      CONVERSATION TRANSCRIPT:
      ${textMessages}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return (response.text || "").trim().replace(/^["']|["']$/g, '');
    } catch (e) {
      console.warn("Failed to generate custom title:", e);
      return "Tutor Lesson Segment";
    }
  }
};
