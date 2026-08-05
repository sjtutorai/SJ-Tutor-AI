const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  'if (!userProf.hasCompletedOnboarding) {\n               setMode(AppMode.PROFILE);\n             }',
  'if (!userProf.hasCompletedOnboarding) {\n               setMode(AppMode.PROFILE);\n             } else {\n               setMode(AppMode.DASHBOARD);\n             }'
);

fs.writeFileSync('App.tsx', code);
