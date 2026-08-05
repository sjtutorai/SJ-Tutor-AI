const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

code = code.replace(
  "${SettingsService.getTutorSystemInstruction()}` + (userContext ? `\\n\\nUser Context \\${SettingsService.getTutorSystemInstruction()} Memory (Past Interactions):\\n${userContext}` : ``)",
  "${SettingsService.getTutorSystemInstruction()}` + (userContext ? `\\n\\nUser Context & Memory (Past Interactions):\\n\\n${userContext}` : ``)"
);

fs.writeFileSync('services/geminiService.ts', code);
