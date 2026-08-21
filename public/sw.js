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

  const rawData = payload.data || payload;
  const isCall = rawData.type === 'call' || 
                 rawData.callId || 
                 (payload.title && payload.title.toLowerCase().includes('call')) ||
                 (payload.notification?.title && payload.notification.title.toLowerCase().includes('call'));

  const callId = rawData.callId || '';
  const callerName = rawData.callerName || 'A Student / Teacher';
  const callType = rawData.callType || (payload.title && payload.title.toLowerCase().includes('video') ? 'video' : 'audio');

  let title = payload.title || payload.notification?.title || 'SJ Tutor AI';
  let body = payload.body || payload.notification?.body || 'You have a new update!';
  const category = rawData.category || payload.category || (isCall ? 'Important Alerts' : 'New Features');
  const notificationId = rawData.notificationId || payload.notificationId || (isCall ? `call_${callId}` : Date.now().toString());

  let options = {};

  if (isCall) {
    title = `📞 Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`;
    body = `${callerName} is calling you on SJ Tutor AI. Tap Accept to connect.`;
    options = {
      body: body,
      icon: rawData.callerAvatar || 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
      badge: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
      tag: `call_${callId}`,
      renotify: true,
      requireInteraction: true, // Keeps call notification persistent on screen until answered or declined like a phone call
      vibrate: [500, 250, 500, 250, 500, 250, 1000],
      data: {
        url: `${self.location.origin}/?action=accept_call&callId=${encodeURIComponent(callId)}`,
        callId: callId,
        callerName: callerName,
        callType: callType,
        type: 'call',
        notificationId: notificationId,
        category: category,
        ...rawData
      },
      actions: [
        { action: 'accept_call', title: '📞 Accept' },
        { action: 'decline_call', title: '❌ Decline' }
      ]
    };
  } else {
    options = {
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
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );

  // Broadcast the message to all active clients so the UI can update in real-time
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: isCall ? 'CALL_PUSH_RECEIVED' : 'PUSH_RECEIVED',
          callId: callId,
          notification: {
            id: notificationId,
            title: title,
            body: body,
            category: category,
            createdAt: Date.now(),
            read: false,
            userId: 'all',
            metadata: rawData
          }
        });
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received, action:', event.action);
  event.notification.close();

  const data = event.notification.data || {};
  const callId = data.callId;

  // Handle Decline Action directly from notification banner
  if (event.action === 'decline_call' && callId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'DECLINE_CALL_ACTION',
            callId: callId
          });
        });
        return fetch('/api/calls/decline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: callId })
        }).catch((err) => console.warn('[Service Worker] Background decline network notice:', err));
      })
    );
    return;
  }

  // Handle Accept Action or Direct Click to open/focus the App
  let urlToOpen = data.url || self.location.origin;
  if (event.action === 'accept_call' && callId) {
    urlToOpen = `${self.location.origin}/?action=accept_call&callId=${encodeURIComponent(callId)}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          if (callId) {
            client.postMessage({
              type: event.action === 'accept_call' ? 'ACCEPT_CALL_ACTION' : 'VIEW_CALL_ACTION',
              callId: callId
            });
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Client-to-ServiceWorker Messaging Interface
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_CALL_NOTIFICATION') {
    const call = event.data.call;
    if (!call) return;

    const callType = call.type === 'video' ? 'Video' : 'Audio';
    const title = `📞 Incoming ${callType} Call`;
    const options = {
      body: `${call.callerName || 'Scholar'} is calling you on SJ Tutor AI. Tap to answer.`,
      icon: call.callerAvatar || 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
      badge: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
      tag: `call_${call.id}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 500, 250, 1000],
      data: {
        type: 'call',
        callId: call.id,
        callerName: call.callerName,
        callerAvatar: call.callerAvatar,
        callType: call.type,
        url: `${self.location.origin}/?action=accept_call&callId=${encodeURIComponent(call.id)}`
      },
      actions: [
        { action: 'accept_call', title: '📞 Accept' },
        { action: 'decline_call', title: '❌ Decline' }
      ]
    };
    self.registration.showNotification(title, options);
  } else if (event.data.type === 'DISMISS_CALL_NOTIFICATION') {
    const callId = event.data.callId;
    self.registration.getNotifications({ tag: `call_${callId}` }).then((notifications) => {
      notifications.forEach((notif) => notif.close());
    });
  }
});
