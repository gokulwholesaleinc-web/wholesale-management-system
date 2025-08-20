// Scope: /instore-next/ (register with that scope)
const STATIC_CACHE = 'instore-next-static-v1';
const RUNTIME_CACHE = 'instore-next-runtime-v1';

const STATIC_ASSETS = [
  '/instore-next/',
  '/instore-next/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => ![STATIC_CACHE, RUNTIME_CACHE].includes(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Strategy:
//  - /assets/* → stale-while-revalidate
//  - HTML → network-first with fallback to cached app shell
//  - Do NOT cache POST/PUT/DELETE or /pos/* writes (handled by app's offline queue)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (!url.pathname.startsWith('/instore-next') && !url.pathname.startsWith('/assets')) return;
  if (req.method !== 'GET') return;

  if (url.pathname.startsWith('/assets')) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith((async () => {
      try { return await fetch(req); } catch (e) {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match('/instore-next/index.html')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }
});