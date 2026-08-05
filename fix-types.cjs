const fs = require('fs');
let code = fs.readFileSync('types.ts', 'utf8');

code = code.replace(/  timestamp: number;\n  id\?: string;\n  suggestions\?: string\[\];\n/g, '  timestamp: number;\n');

fs.writeFileSync('types.ts', code);
