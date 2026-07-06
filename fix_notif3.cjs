const fs = require('fs');
let code = fs.readFileSync('services/notificationService.ts', 'utf8');
code = code.replace('// @ts-ignore', '// @ts-expect-error');
fs.writeFileSync('services/notificationService.ts', code);
