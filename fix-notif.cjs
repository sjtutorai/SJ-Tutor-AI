const fs = require('fs');
let code = fs.readFileSync('services/notificationService.ts', 'utf8');

code = code.replace(
  /vibrate: \[200, 100, 200\],\n\s*data: { category }\n\s*} as NotificationOptions & { vibrate\?: number\[\] }\n\s*}\);/g,
  'vibrate: [200, 100, 200],\n            data: { category }\n          } as NotificationOptions & { vibrate?: number[] });'
);

fs.writeFileSync('services/notificationService.ts', code);
