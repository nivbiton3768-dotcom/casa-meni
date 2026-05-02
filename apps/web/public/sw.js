// Casa Meni service worker — minimal, app-shell + runtime caching
// Bumping CACHE_VERSION invalidates old caches on next visit.
const CACHE_VERSION = 'casa-meni-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// Strategy:
// - Navigation requests: network-first, fall back to cached / and an offline message
// - Static GETs from same origin: stale-while-revalidate
// - All API calls: network-only (never cache; auth + freshness matter)
// - All other GETs: network-first
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache API requests
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('onrender.com') ||
    url.hostname.includes('plaid.com') ||
    url.hostname.includes('stripe.com')
  ) {
    return; // browser default
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(RUNTIME_CACHE)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then(
              (cached) =>
                cached ||
                caches.match('/') ||
                new Response(
                  '<h1>Offline</h1><p>Please reconnect to use Casa Meni.</p>',
                  { headers: { 'Content-Type': 'text/html' } },
                ),
            ),
        ),
    );
    return;
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.woff2'))
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const networkPromise = fetch(req)
            .then((res) => {
              cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || networkPromise;
        }),
      ),
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
