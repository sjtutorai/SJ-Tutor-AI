const fs = require('fs');
let code = fs.readFileSync('services/notificationService.ts', 'utf8');
code = code.replace(
  `            vibrate: [200, 100, 200],`,
  `            // @ts-ignore\n            vibrate: [200, 100, 200],`
);
fs.writeFileSync('services/notificationService.ts', code);
