// Service Worker with Workbox Caching for SJ Tutor AI
// Fulfills instant assets loading, images, and API fallback caching.

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('Workbox is loaded successfully.');

  // Set up cache names
  const CACHE_NAMES = {
    static: 'sjtutor-assets-v1',
    images: 'sjtutor-images-v1',
    apis: 'sjtutor-api-v1',
  };

  // 1. Cache first for static resources (CSS, JS, Fonts, index.html)
  workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'document' ||
      request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: CACHE_NAMES.static,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // 2. Cache first for images (avatars, icons, diagrams)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: CACHE_NAMES.images,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 150,
          maxAgeSeconds: 60 * 24 * 60 * 60, // 60 Days
          purgeOnQuotaError: true,
        }),
      ],
    })
  );

  // 3. Network first with fallback cache for key API configurations
  // Keeps profile/streak statistics fluid and instantly available on sluggish connections
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/') || url.hostname.includes('firestore'),
    new workbox.strategies.NetworkFirst({
      cacheName: CACHE_NAMES.apis,
      networkTimeoutSeconds: 3, // Fall back to cache after 3 seconds on slow connections
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 1 * 24 * 60 * 60, // 24 Hours
        }),
      ],
    })
  );

  // Install block: activate instantly
  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });
} else {
  // Graceful Vanilla PWA service worker fallback if Workbox CDN is unreachable
  const OFFLINE_CACHE_NAME = 'sjtutor-fallback-v1';
  
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(OFFLINE_CACHE_NAME).then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
        ]).catch(() => {});
      })
    );
    self.skipWaiting();
  });

  self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(OFFLINE_CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline: Connection sluggish or down.', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        })
    );
  });
}
