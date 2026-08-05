const fs = require('fs');
const lines = fs.readFileSync('services/geminiService.ts', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('SettingsService.getTutorSystemInstruction()') && lines[i].includes('userContext')) {
    lines[i] = "      ${SettingsService.getTutorSystemInstruction()}` + (userContext ? `\\n\\nUser Context & Memory (Past Interactions):\\n\\n${userContext}` : '');";
    break;
  }
}

fs.writeFileSync('services/geminiService.ts', lines.join('\n'));
