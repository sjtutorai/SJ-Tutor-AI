const fs = require('fs');
let code = fs.readFileSync('services/notificationService.ts', 'utf8');
code = code.replace('// @ts-expect-error', '// @ts-expect-error missing vibrate type in lib');
fs.writeFileSync('services/notificationService.ts', code);
