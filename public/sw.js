// Service Worker for SJ Tutor AI - Offline support, core assets caching & push notifications

const CACHE_NAME = 'sjtutor-core-assets-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core assets');
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch interception for offline loading and caching of core resources
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests, developer tools (chrome-extension, etc.), or non-HTTP protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Exclude API requests from core asset cache, but return a clean offline response when offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ 
            error: 'Offline', 
            message: 'You have lost your internet connection. Some AI features are temporarily unavailable.',
            offline: true 
          }), 
          { 
            status: 503, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      })
    );
    return;
  }

  // Stale-While-Revalidate caching strategy for standard assets and web views
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            // Check if response is valid before caching
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback for document navigation if completely offline
            if (request.mode === 'navigate') {
              return cache.match('/index.html') || cache.match('/');
            }
          });

        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Push Notification Listeners
self.addEventListener('push', (event) => {
  let data = { title: 'SJ Tutor AI', body: 'A new study reminder is due!', icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { ...data, body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
    badge: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
