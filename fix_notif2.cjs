const fs = require('fs');
let code = fs.readFileSync('components/NotificationContext.tsx', 'utf8');

code = code.replace(
  `        if (!notif.read && !seenNotificationIdsRef.current.has(notif.id)) {
          // If it's a new unread notification that we haven't seen since the app opened/loaded
          // AND it was NOT triggered by this very device
          const isFromThisDevice = notif.triggerDeviceId === deviceIdRef.current;
          if (!isFromThisDevice && Date.now() - notif.timestamp < 3600 * 1000) {
            triggerSystemNotification(\`[\${notif.category}] \${notif.title}\`, notif.body);
            triggerToastRef.current(notif.title, notif.body, notif.category);
          }
        }
          // and its timestamp is recent (e.g. not older than 1 hour, to prevent offline queue popups)
          if (Date.now() - notif.timestamp < 3600 * 1000) {
            triggerSystemNotification(\`[\${notif.category}] \${notif.title}\`, notif.body);
            triggerToastRef.current(notif.title, notif.body, notif.category);
          }
        }`,
  `        if (!notif.read && !seenNotificationIdsRef.current.has(notif.id)) {
          // If it's a new unread notification that we haven't seen since the app opened/loaded
          // AND it was NOT triggered by this very device
          const isFromThisDevice = notif.triggerDeviceId === deviceIdRef.current;
          if (!isFromThisDevice && Date.now() - notif.timestamp < 3600 * 1000) {
            triggerSystemNotification(\`[\${notif.category}] \${notif.title}\`, notif.body);
            triggerToastRef.current(notif.title, notif.body, notif.category);
          }
        }`
);

fs.writeFileSync('components/NotificationContext.tsx', code);
