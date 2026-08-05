const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  'const App = () => {',
  'const sanitizeSlug = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "general";\n\nconst App = () => {'
);

fs.writeFileSync('App.tsx', code);
