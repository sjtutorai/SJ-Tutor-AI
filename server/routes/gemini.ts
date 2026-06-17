import { Router, Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = Router();

// Helper to initialize AI client.
// It checks both GEMINI_API_KEY and API_KEY.
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: Gemini API key is not configured on the server.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// 1. Process note
router.post("/processNoteAI", async (req: Request, res: Response) => {
  try {
    const { content, task, targetLang, settings } = req.body;
    const ai = getAI();
    const language = targetLang || settings?.learning?.language || "English";

    const taskPrompts = {
      summarize: `Create a bulleted 'Revision Box' summary for the following note in ${language}. Focus on key definitions and dates.`,
      simplify: `Rewrite this note in very simple ${language} so a younger student can understand it perfectly.`,
      mcq: `Generate 5 high-quality Multiple Choice Questions with answers in ${language} based ONLY on this note content. Return as Markdown list.`,
      translate: `Translate this note professionally into ${language}, maintaining academic terminology where appropriate.`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `${taskPrompts[task as keyof typeof taskPrompts]}\n\nNOTE CONTENT:\n${content}`,
      config: {
        systemInstruction: `You are an AI study assistant. You must communicate and generate content strictly in ${language}.`
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in processNoteAI:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2. Generate Note Template
router.post("/generateNoteTemplate", async (req: Request, res: Response) => {
  try {
    const { subject, chapter, templateType, settings } = req.body;
    const ai = getAI();
    const language = settings?.learning?.language || "English";

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
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in generateNoteTemplate:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 3. Generate Summary Stream
router.post("/generateSummaryStream", async (req: Request, res: Response) => {
  try {
    const { data, settings } = req.body;
    const ai = getAI();
    const language = data.language || settings?.learning?.language || "English";

    const prompt = `
      Create a comprehensive, structured summary for the following study material.
      THE ENTIRE SUMMARY MUST BE WRITTEN IN ${language.toUpperCase()}.
      
      Subject: ${data.subject}
      Class/Grade: ${data.gradeClass || settings?.learning?.grade}
      Education Board: ${data.board}
      Language: ${language}
      Chapter Name: ${data.chapterName}
      ${data.author ? `Author: ${data.author}` : ''}
      
      Style Preference: ${settings?.aiTutor?.explanationStyle || "Detailed"}
    `;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert academic tutor. Personality: ${settings?.aiTutor?.personality || "Friendly"}. You generate content only in ${language}.`,
      }
    });

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked"
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (error: any) {
    console.error("Error in generateSummaryStream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Internal server error" });
    } else {
      res.end();
    }
  }
});

// 4. Solve Homework Stream
router.post("/solveHomeworkStream", async (req: Request, res: Response) => {
  try {
    const { data, imagesBase64, settings } = req.body;
    const ai = getAI();
    const language = data.language || settings?.learning?.language || "English";

    const prompt = `
      You are an expert Homework Solver and Academic Tutor.
      
      User Information:
      - Subject: ${data.subject}
      - Class/Grade: ${data.gradeClass || settings?.learning?.grade}
      - Board: ${data.board}
      - Language: ${language}
      - Chapter/Topic: ${data.chapterName}

      Input:
      ${data.homeworkQuery ? `Text Question/Description: "${data.homeworkQuery}"` : "No text description provided."}
      ${imagesBase64 && imagesBase64.length > 0 ? `Images: I have attached ${imagesBase64.length} image(s) of the homework/problem.` : "No images provided."}
      
      Requirements:
      1. Carefully analyze ALL inputs (text and images).
      2. If images are provided, extract the text/problems from them.
      3. Provide a clear, step-by-step solution for all identified problems.
      4. Explain the underlying concepts simply so the student can learn, not just copy.
      5. THE ENTIRE RESPONSE MUST BE IN ${language.toUpperCase()}.
      
      If the inputs are unclear or do not contain educational problems, politely ask the student for more details or clearer photos.
    `;

    const contents: any[] = [{ text: prompt }];
    
    if (imagesBase64 && imagesBase64.length > 0) {
      imagesBase64.forEach((img: string) => {
        const cleanBase64 = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
      });
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: {
        parts: contents
      },
      config: {
        systemInstruction: `You are an expert Homework Solver and Academic Tutor. Tone: ${settings?.aiTutor?.personality || "Friendly"}. You generate content only in ${language}.`,
      }
    });

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked"
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (error: any) {
    console.error("Error in solveHomeworkStream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Internal server error" });
    } else {
      res.end();
    }
  }
});

// 5. Generate Quiz
router.post("/generateQuiz", async (req: Request, res: Response) => {
  try {
    const { data, settings } = req.body;
    const ai = getAI();
    const language = data.language || settings?.learning?.language || "English";
    const count = data.questionCount || 5;
    const difficulty = data.difficulty || settings?.learning?.difficulty || 'Medium';

    const prompt = `
      Create a ${count}-question multiple-choice quiz based on the following chapter details.
      EVERYTHING INCLUDING QUESTIONS, OPTIONS, AND EXPLANATIONS MUST BE IN ${language.toUpperCase()}.
      
      The difficulty level of the questions should be: ${difficulty}.
      Return the result as a JSON array.
      
      IMPORTANT: Randomize the position of the correct answer for every question.
      
      Subject: ${data.subject}
      Chapter: ${data.chapterName}
      Class: ${data.gradeClass || settings?.learning?.grade}
      Board: ${data.board}
      Language: ${language}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("Failed to generate quiz data");
    }
  } catch (error: any) {
    console.error("Error in generateQuiz:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 6. Generate Study Timetable
router.post("/generateStudyTimetable", async (req: Request, res: Response) => {
  try {
    const { examDate, subjects, hoursPerDay, settings } = req.body;
    const ai = getAI();
    const language = settings?.learning?.language || "English";
    const today = new Date().toDateString();
    
    const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("Failed to generate timetable");
    }
  } catch (error: any) {
    console.error("Error in generateStudyTimetable:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 7. Update Study Timetable
router.post("/updateStudyTimetable", async (req: Request, res: Response) => {
  try {
    const { currentTimetable, instruction, settings } = req.body;
    const ai = getAI();
    const language = settings?.learning?.language || "English";
    
    const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("Failed to update timetable");
    }
  } catch (error: any) {
    console.error("Error in updateStudyTimetable:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 8. Chat Stream
router.post("/chat-stream", async (req: Request, res: Response) => {
  try {
    const { history, systemInstruction } = req.body;
    const ai = getAI();

    // Reconstruct the chat with the history up to the last message,
    // then send the last message.
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
      },
      history: history.slice(0, -1).map((msg: any) => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }))
    });

    const responseStream = await chat.sendMessageStream({
      message: history[history.length - 1].text
    });

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked"
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();
  } catch (error: any) {
    console.error("Error in chat-stream:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Internal server error" });
    } else {
      res.end();
    }
  }
});

// 9. Validate Payment Screenshot
router.post("/validatePaymentScreenshot", async (req: Request, res: Response) => {
  try {
    const { imageBase64, planName, price } = req.body;
    const ai = getAI();
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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

    if (response.text) {
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("Failed to analyze image");
    }
  } catch (error: any) {
    console.error("Error in validatePaymentScreenshot:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;
