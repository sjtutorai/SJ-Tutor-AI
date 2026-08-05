const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

// Modify chatWithTutorStream definition
code = code.replace(
  "chatWithTutorStream: async (text: string, history: any[], imagesBase64: string[] = [], extraFiles: { name: string; type: string; dataUrl: string; textContent?: string }[] = []) => {",
  "chatWithTutorStream: async (text: string, history: any[], imagesBase64: string[] = [], extraFiles: { name: string; type: string; dataUrl: string; textContent?: string }[] = [], userContext?: string) => {"
);

// Inject userContext into systemInstruction
code = code.replace(
  "${SettingsService.getTutorSystemInstruction()}`;",
  "${SettingsService.getTutorSystemInstruction()}` + (userContext ? `\\n\\nUser Context & Memory (Past Interactions):\\n${userContext}` : '');"
);

fs.writeFileSync('services/geminiService.ts', code);
