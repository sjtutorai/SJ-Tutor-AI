import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING: The Gemini API Key is missing on the server. Please check your settings.");
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

async function generateContentWithFallback(ai: any, params: any, maxRetries = 2) {
  const modelsToTry = [params.model || 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let delay = 500;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SJ Tutor AI] Attempting generateContent using model ${model}, attempt ${attempt}/${maxRetries}`);
        const response = await ai.models.generateContent({
          ...params,
          model: model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.error(`[SJ Tutor AI] Attempt ${attempt} with model ${model} failed:`, err.message || err);
        
        const errMsg = String(err.message || "").toUpperCase();
        const errStatus = err.status || (err.error && err.error.code) || 0;
        const isTransient = errStatus === 503 || errStatus === 429 ||
                            errMsg.includes("503") || errMsg.includes("429") ||
                            errMsg.includes("UNAVAILABLE") || errMsg.includes("RESOURCE_EXHAUSTED") ||
                            errMsg.includes("HIGH DEMAND") || errMsg.includes("TEMPORARY");
        
        if (!isTransient || attempt === maxRetries) {
          break; // Try next model in fallback list, or fail out if last
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
  }

  throw lastError;
}

async function generateContentStreamWithFallback(ai: any, params: any, maxRetries = 2) {
  const modelsToTry = [params.model || 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let delay = 500;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SJ Tutor AI] Attempting generateContentStream using model ${model}, attempt ${attempt}/${maxRetries}`);
        const stream = await ai.models.generateContentStream({
          ...params,
          model: model,
        });
        return stream;
      } catch (err: any) {
        lastError = err;
        console.error(`[SJ Tutor AI] Stream attempt ${attempt} with model ${model} failed:`, err.message || err);

        const errMsg = String(err.message || "").toUpperCase();
        const errStatus = err.status || (err.error && err.error.code) || 0;
        const isTransient = errStatus === 503 || errStatus === 429 ||
                            errMsg.includes("503") || errMsg.includes("429") ||
                            errMsg.includes("UNAVAILABLE") || errMsg.includes("RESOURCE_EXHAUSTED") ||
                            errMsg.includes("HIGH DEMAND") || errMsg.includes("TEMPORARY");
        
        if (!isTransient || attempt === maxRetries) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
  }

  throw lastError;
}

async function streamToResponse(res: express.Response, responseGen: any) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  try {
    for await (const chunk of responseGen) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("Stream generation error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

router.post("/process-note", async (req, res) => {
  try {
    const { content, task, targetLang, settings } = req.body;
    const ai = getAI();
    const language = targetLang || settings.learning.language;

    const taskPrompts = {
      summarize: `Create a bulleted 'Revision Box' summary for the following note in ${language}. Focus on key definitions and dates.`,
      simplify: `Rewrite this note in very simple ${language} so a younger student can understand it perfectly.`,
      mcq: `Generate 5 high-quality Multiple Choice Questions with answers in ${language} based ONLY on this note content. Return as Markdown list.`,
      translate: `Translate this note professionally into ${language}, maintaining academic terminology where appropriate.`
    };

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: `${taskPrompts[task as keyof typeof taskPrompts]}\n\nNOTE CONTENT:\n${content}`,
      config: {
        systemInstruction: `You are an AI study assistant. You must communicate and generate content strictly in ${language}.`
      }
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Error in process-note:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-template", async (req, res) => {
  try {
    const { subject, chapter, templateType, settings } = req.body;
    const ai = getAI();
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

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Error in generate-template:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/timetable", async (req, res) => {
  try {
    const { examDate, subjects, hoursPerDay, settings } = req.body;
    const ai = getAI();
    const language = settings.learning.language;
    const today = new Date().toDateString();

    const prompt = `Current Date: ${today}. Goal: Create a study timetable in ${language} up to the exam date: ${examDate}. Subjects: ${subjects}. Daily limit: ${hoursPerDay} hours. Output strict JSON.`;

    const response = await generateContentWithFallback(ai, {
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

    res.json(JSON.parse(response.text?.trim() || "[]"));
  } catch (err: any) {
    console.error("Error in timetable:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/timetable-update", async (req, res) => {
  try {
    const { currentTimetable, instruction, settings } = req.body;
    const ai = getAI();
    const language = settings.learning.language;

    const prompt = `Update the timetable based on: "${instruction}". Generate response in ${language}.\n\nCurrent: ${JSON.stringify(currentTimetable)}`;

    const response = await generateContentWithFallback(ai, {
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

    res.json(JSON.parse(response.text?.trim() || "[]"));
  } catch (err: any) {
    console.error("Error in timetable-update:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/validate-payment", async (req, res) => {
  try {
    const { imageBase64, planName, price } = req.body;
    const ai = getAI();
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const prompt = `Analyze this image for plan "${planName}". Checks: Status SUCCESS, Amount exactly ₹${price}, Payee "SHIVABASAVARAJ SADASHIVAPPA JYOTI". Return JSON {isValid, reason}.`;

    const response = await generateContentWithFallback(ai, {
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

    res.json(JSON.parse(response.text?.trim() || "{}"));
  } catch (err: any) {
    console.error("Error in validate-payment:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/quiz", async (req, res) => {
  try {
    const { data, settings } = req.body;
    const ai = getAI();
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

    const response = await generateContentWithFallback(ai, {
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

    res.json(JSON.parse(response.text?.trim() || "[]"));
  } catch (err: any) {
    console.error("Error in quiz generation:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/summary-stream", async (req, res) => {
  try {
    const { data, settings } = req.body;
    const ai = getAI();
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

    const responseGen = await generateContentStreamWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are an expert academic tutor. Personality: ${settings.aiTutor.personality}. You generate content only in ${language}.`,
      }
    });

    await streamToResponse(res, responseGen);
  } catch (err: any) {
    console.error("Error in summary-stream:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.post("/solve-homework-stream", async (req, res) => {
  try {
    const { data, imagesBase64 = [], settings } = req.body;
    const ai = getAI();
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
      ${imagesBase64.length > 0 ? `Images: I have attached ${imagesBase64.length} image(s) of the homework/problem.` : "No images provided."}
      
      Requirements:
      1. Carefully analyze ALL inputs (text and images).
      2. If images are provided, extract the text/problems from them.
      3. Provide a clear, step-by-step solution for all identified problems.
      4. Explain the underlying concepts simply so the student can learn, not just copy.
      5. THE ENTIRE RESPONSE MUST BE IN ${language.toUpperCase()}.
      
      If the inputs are unclear or do not contain educational problems, politely ask the student for more details or clearer photos.
    `;

    const contents: any[] = [{ text: prompt }];
    
    imagesBase64.forEach((img: string) => {
      const cleanBase64 = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
      contents.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
    });

    const responseGen = await generateContentStreamWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: {
        parts: contents
      },
      config: {
        systemInstruction: `You are an expert Homework Solver and Academic Tutor. Tone: ${settings.aiTutor.personality}. You generate content only in ${language}.`,
      }
    });

    await streamToResponse(res, responseGen);
  } catch (err: any) {
    console.error("Error in solve-homework-stream:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.post("/chat-stream", async (req, res) => {
  try {
    const { messages = [], latestMessage, settings } = req.body;
    const ai = getAI();
    const language = settings.learning.language;

    const systemInstruction = `
      You are an AI Tutor in the "SJ Tutor AI" app.
      
      Your Personality: ${settings.aiTutor.personality} ${settings.aiTutor.personality === 'Friendly' ? '😊' : settings.aiTutor.personality === 'Professional' ? '🎓' : '🧠'}.
      Explanation Style: ${settings.aiTutor.explanationStyle}.
      Answer Format: ${settings.aiTutor.answerFormat}.
      Language Preference: ${language}.
      Student Grade/Class: ${settings.learning.grade}.
      
      ${settings.aiTutor.followUp ? "Always ask a relevant follow-up question to check understanding." : ""}
      
      Goal: Help the student learn effectively.
    `;

    const contents = [
      ...messages.map((m: any) => ({
        role: m.role || "user",
        parts: [{ text: m.text }]
      })),
      { role: "user", parts: [{ text: latestMessage }] }
    ];

    const responseGen = await generateContentStreamWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction
      }
    });

    await streamToResponse(res, responseGen);
  } catch (err: any) {
    console.error("Error in chat-stream:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
