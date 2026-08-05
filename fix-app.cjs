const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  "recentSessions={history.filter((h) => h.type === AppMode.TUTOR)}",
  "recentSessions={history.filter((h) => h.type === AppMode.TUTOR)}\n              fullHistory={history}"
);

fs.writeFileSync('App.tsx', code);
