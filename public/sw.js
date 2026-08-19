// Service Worker to handle Offline Sync, Push Notifications and FCM background messages

const CACHE_NAME = 'sjtutor-offline-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing & Caching core shell...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Static asset caching notice:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating & cleaning old caches...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-first / Network-fallback fetch handler for seamless offline navigation & assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip Firebase/Firestore/Google API calls from service worker cache
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
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
    icon: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
    badge: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
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
