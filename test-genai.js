import { GoogleGenAI } from "@google/genai";
async function run() {
  const ai = new GoogleGenAI({ apiKey: 'dummy' });
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{text: 'hi'}] },
        { role: 'user', parts: [{text: 'hi again'}] }
      ]
    });
    for await (const chunk of stream) {}
  } catch (e) {
    console.log("CAUGHT", e.message);
  }
}
run();
