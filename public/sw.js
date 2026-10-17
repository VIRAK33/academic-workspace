const CACHE_NAME = 'phd-workspace-v3';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

// Helper to safely cache only HTTP and HTTPS requests
function safeCachePut(cache, req, res) {
  try {
    if (req && req.url && (req.url.startsWith('http://') || req.url.startsWith('https://'))) {
      return cache.put(req, res).catch(() => {});
    }
  } catch (e) {}
}

// Install: Cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('PWA Precache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle standard HTTP and HTTPS requests
  // Ignore chrome-extension://, moz-extension://, blob:, data:, etc.
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  // Skip non-GET requests (e.g. Google Auth scripts or POST API requests)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. Navigation requests (HTML pages): Network first, fallback to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match('./') || caches.match('/index.html');
        })
    );
    return;
  }

  // 2. API requests: Network first, with graceful offline JSON fallback if needed
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: 'Offline mode active' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        });
      })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Fonts): Cache first, fallback to network & cache
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to revalidate (Stale-while-revalidate for local origin)
        if (url.origin === self.location.origin) {
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, networkResponse));
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          safeCachePut(cache, request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

// 4. Background Push Notification Event Listener (W3C Web Push API)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Academic Workspace Alert',
    body: 'You have an upcoming academic event or class.',
    url: '/',
    tag: 'academic-alert',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'academic-alert',
    renotify: true,
    data: {
      url: data.url || (
        data.previewType && data.previewId
          ? `/?previewType=${encodeURIComponent(data.previewType)}&previewId=${encodeURIComponent(data.previewId)}`
          : '/'
      ),
      previewType: data.previewType,
      previewId: data.previewId,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Academic Workspace', options));
});

// 5. Notification interaction: Focus or reopen PWA and trigger preview modal
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const previewType = notifData.previewType;
  const previewId = notifData.previewId;
  const targetUrl = notifData.url || (
    previewType && previewId
      ? `/?previewType=${encodeURIComponent(previewType)}&previewId=${encodeURIComponent(previewId)}`
      : '/'
  );

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then(() => {
            if (previewType && previewId) {
              client.postMessage({
                type: 'NOTIFICATION_PREVIEW_OPEN',
                previewType,
                previewId,
              });
            }
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});


