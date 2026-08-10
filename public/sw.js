// Service Worker to handle Push Notifications and FCM background messages

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  let payload = {};
  
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    if (event.data) {
      payload = { title: 'SJ Tutor AI', body: event.data.text() };
    }
  }

  const title = payload.title || payload.notification?.title || 'SJ Tutor AI';
  const body = payload.body || payload.notification?.body || 'You have a new update!';
  const category = payload.data?.category || payload.category || 'Important Alerts';
  const notificationId = payload.data?.notificationId || payload.notificationId || Date.now().toString();

  const options = {
    body: body,
    icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
    badge: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: self.location.origin,
      notificationId: notificationId,
      category: category,
      ...payload
    },
    actions: [
      { action: 'open', title: 'Open SJ Tutor AI' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );

  // Broadcast the message to all active clients so the UI can update in real-time
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          notification: {
            id: notificationId,
            title: title,
            body: body,
            category: category,
            createdAt: Date.now(),
            read: false,
            userId: 'all'
          }
        });
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
