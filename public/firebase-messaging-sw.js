// Firebase Cloud Messaging compat Service Worker

importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyApvrjOz196Z3feFfkW6y3W7r4OQiM6oIY",
  authDomain: "sj-tutorai.firebaseapp.com",
  projectId: "sj-tutorai",
  storageBucket: "sj-tutorai.firebasestorage.app",
  messagingSenderId: "215292591396",
  appId: "1:215292591396:web:8a3ccdf84585651e4c47b1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message: ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'SJ Tutor AI';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New message!',
    icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
    badge: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
    data: {
      url: self.location.origin,
      notificationId: payload.data?.notificationId || Date.now().toString(),
      category: payload.data?.category || 'Important Alerts'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Fallback to standard push listener
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Native Push event: ', event);
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    if (event.data) {
      payload = { title: 'SJ Tutor AI', body: event.data.text() };
    }
  }

  // Only show if not already handled by FCM compat library
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
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );

  // Broadcast
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
