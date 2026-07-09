const { GoogleGenAI } = require('@google/genai');
async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{text: 'hi'}] },
        { role: 'user', parts: [{text: 'hi again'}] }
      ]
    });
    for await (const chunk of stream) {
      console.log(chunk.text);
    }
  } catch (e) {
    console.log("CAUGHT", e.message);
  }
}
run();
