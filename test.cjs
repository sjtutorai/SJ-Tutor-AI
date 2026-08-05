const fs = require('fs');
let code = fs.readFileSync('components/TutorChat.tsx', 'utf8');
code = code.replace(
  "recentSessions?: any[];",
  "recentSessions?: any[];\n  fullHistory?: any[];"
);
code = code.replace(
  "recentSessions,\n    activeSessionId,",
  "recentSessions,\n    fullHistory,\n    activeSessionId,"
);
fs.writeFileSync('components/TutorChat.tsx', code);
