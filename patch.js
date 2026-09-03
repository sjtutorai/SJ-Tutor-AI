const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');
code = code.replace(
  'Keep it engaging like a group message. Respond in ${language}.`;',
  'Keep it engaging like a group message. Respond in ${language}.\n    If a user asks you to create, generate, or draw an image or picture, you MUST output a special markdown command in this exact format on a new line: <GENERATE_IMAGE: "detailed prompt for the image here">`;'
);
fs.writeFileSync('services/geminiService.ts', code);
