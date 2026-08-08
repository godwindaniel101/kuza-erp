/* Kuza service worker — PWA layer 1 (install + read-offline).
 *
 * Strategy, chosen so money data can never go stale-and-wrong:
 *  - Static assets (/_next/static, icons): cache-first (immutable by hash).
 *  - Public menu pages (/m/*) + their API (/api/public/menu/*): network-first
 *    with cache fallback — a guest who scanned once can reopen the menu with
 *    no signal.
 *  - Authenticated API GETs: network-first, cache fallback marked implicitly
 *    stale (the app treats it as last-seen data when offline).
 *  - Non-GET requests are NEVER intercepted — writes always hit the network;
 *    offline write-queueing is layer 2, handled in-app, not here.
 */
// Bump this on every deploy that must invalidate cached assets — the activate
// handler deletes any cache whose key doesn't start with the current VERSION,
// so a returning browser drops stale /_next/static chunks and picks up the new
// build (fixes: old JS bundle served after a deploy).
const VERSION = 'kuza-sw-v2';
const STATIC_CACHE = `${VERSION}-static`;
const DATA_CACHE = `${VERSION}-data`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/manifest.json', '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // writes never touch the SW
  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) {
    // Same-origin only, except the API host in dev (different port).
    if (!url.pathname.startsWith('/api')) return;
  }

  // Hashed build assets: cache-first.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // API GETs and pages: network-first, cache fallback, offline page last.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && (url.pathname.startsWith('/api/') || request.mode === 'navigate' || url.pathname.startsWith('/m/'))) {
          const copy = res.clone();
          caches.open(DATA_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        if (request.mode === 'navigate') {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        return new Response(JSON.stringify({ success: false, offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
  );
});
