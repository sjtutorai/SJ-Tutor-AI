// Firebase Cloud Messaging compat Service Worker

importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAwnA96M3oFEF1o_Vrs9HhZxmHav8f-Gm8",
  authDomain: "sj-tutorai.firebaseapp.com",
  projectId: "sj-tutorai",
  storageBucket: "sj-tutorai.firebasestorage.app",
  messagingSenderId: "215292591396",
  appId: "1:215292591396:web:4af74df6521eaa2a4c47b1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message: ', payload);
  
  const rawData = payload.data || payload;
  const isCall = rawData.type === 'call' || 
                 rawData.callId || 
                 (payload.notification?.title && payload.notification.title.toLowerCase().includes('call')) ||
                 (payload.data?.title && payload.data.title.toLowerCase().includes('call'));

  const callId = rawData.callId || '';
  const callerName = rawData.callerName || 'A Student / Teacher';
  const callType = rawData.callType || (payload.notification?.title && payload.notification.title.toLowerCase().includes('video') ? 'video' : 'audio');

  let notificationTitle = payload.notification?.title || payload.data?.title || 'SJ Tutor AI';
  let notificationOptions = {};

  if (isCall) {
    notificationTitle = `📞 Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`;
    notificationOptions = {
      body: `${callerName} is calling you on SJ Tutor AI. Tap Accept to connect.`,
      icon: rawData.callerAvatar || 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
      badge: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
      tag: `call_${callId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 500, 250, 1000],
      data: {
        url: `${self.location.origin}/?action=accept_call&callId=${encodeURIComponent(callId)}`,
        callId: callId,
        callerName: callerName,
        callType: callType,
        type: 'call',
        notificationId: `call_${callId}`,
        category: 'Important Alerts',
        ...rawData
      },
      actions: [
        { action: 'accept_call', title: '📞 Accept' },
        { action: 'decline_call', title: '❌ Decline' }
      ]
    };
  } else {
    notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New message!',
      icon: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
      badge: 'https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg',
      vibrate: [100, 50, 100],
      data: {
        url: self.location.origin,
        notificationId: payload.data?.notificationId || Date.now().toString(),
        category: payload.data?.category || 'Important Alerts',
        ...rawData
      },
      actions: [
        { action: 'open', title: 'Open SJ Tutor AI' }
      ]
    };
  }

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
      requireInteraction: true,
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

  // Broadcast
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
  console.log('[firebase-messaging-sw.js] Notification click Received, action:', event.action);
  event.notification.close();

  const data = event.notification.data || {};
  const callId = data.callId;

  // Handle Decline Action
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
        }).catch((err) => console.warn('[firebase-messaging-sw.js] Background decline network notice:', err));
      })
    );
    return;
  }

  let urlToOpen = data.url || self.location.origin;
  if (event.action === 'accept_call' && callId) {
    urlToOpen = `${self.location.origin}/?action=accept_call&callId=${encodeURIComponent(callId)}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
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
