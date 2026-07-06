const fs = require('fs');
let code = fs.readFileSync('components/NotificationContext.tsx', 'utf8');

// 1. Generate device ID
code = code.replace(
  `export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {`,
  `export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const deviceIdRef = useRef<string>('dev-' + Math.random().toString(36).substring(2, 9));`
);

// 2. Add triggerDeviceId to payload
code = code.replace(
  `    const payload = {
      userId: targetUser,
      title,
      body,
      category,
      timestamp,
      read: false
    };`,
  `    const payload = {
      userId: targetUser,
      title,
      body,
      category,
      timestamp,
      read: false,
      triggerDeviceId: deviceIdRef.current
    };`
);

// 3. Add triggerDeviceId to items parsed from Firestore
code = code.replace(
  `              timestamp: data.timestamp || Date.now(),
              read: data.read || false,`,
  `              timestamp: data.timestamp || Date.now(),
              read: data.read || false,
              triggerDeviceId: data.triggerDeviceId,`
);
code = code.replace(
  `              timestamp: data.timestamp || Date.now(),
              read: isRead,`,
  `              timestamp: data.timestamp || Date.now(),
              read: isRead,
              triggerDeviceId: data.triggerDeviceId,`
);

// 4. Update the trigger check in mergeAndStore
code = code.replace(
  `        if (!notif.read && !seenNotificationIdsRef.current.has(notif.id)) {
          // If it's a new unread notification that we haven't seen since the app opened/loaded`,
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

// 5. Remove the local trigger SystemNotification when sending a notification
code = code.replace(
  `    // 1. Emit instant system notification to the current admin/user if they qualify
    const shouldSystemShow = targetUser === 'all' || (currentUser && targetUser === currentUser.uid);
    if (shouldSystemShow) {
      triggerSystemNotification(\`[\${category}] \${title}\`, body);
    }`,
  `    // 1. Emit instant system notification locally? No, we will let Firestore trigger it if we want.
    // Actually, we SHOULD trigger it locally if we want the local user to see it. 
    // BUT the requirement is: "Notifications should be sent to every registered device EXCEPT the one that triggered the action."
    // So we completely skip triggering locally!`
);

// Add triggerDeviceId to NotificationItem interface in types.ts?
// Wait, NotificationItem is defined in types.ts!
fs.writeFileSync('components/NotificationContext.tsx', code);
