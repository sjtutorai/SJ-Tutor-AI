const fs = require('fs');
let code = fs.readFileSync('components/NotificationContext.tsx', 'utf8');
code = code.replace(
  `  timestamp: number;
  read: boolean;
}`,
  `  timestamp: number;
  read: boolean;
  triggerDeviceId?: string;
}`
);
fs.writeFileSync('components/NotificationContext.tsx', code);
