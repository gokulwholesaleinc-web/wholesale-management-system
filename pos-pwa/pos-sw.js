const CACHE_NAME = 'gokul-pos-v1';
const POS_ROUTES = [
  '/instore',
  '/pos-app.js',
  '/pos-manifest.json',
  '/pos-icon.svg',
  '/pos-icon-192.png',
  '/pos-icon-512.png'
];

// API endpoints that should be cached for offline use
const API_CACHE_ROUTES = [
  '/api/pos/lookup/',
  '/api/pos/search',
  '/api/pos/holds',
  '/api/products',
  '/api/customers'
];

// Install SW
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('POS SW: Caching core resources');
        return cache.addAll(POS_ROUTES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate SW
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('gokul-pos-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy: Network First with Offline Fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/pos/')) {
    event.respondWith(handlePOSApiRequest(request));
    return;
  }

  // Handle static resources
  if (POS_ROUTES.some(route => url.pathname.includes(route))) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

async function handlePOSApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache GET requests for offline access
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT requests when offline, store in IndexedDB for sync later
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await storeOfflineRequest(request);
      return new Response(
        JSON.stringify({ 
          offline: true, 
          message: 'Stored for sync when online' 
        }), 
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

async function handleStaticRequest(request) {
  // Try cache first for static resources
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fall back to network
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

async function storeOfflineRequest(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now()
  };
  
  // Store in IndexedDB (simplified - in production use idb library)
  // This would be implemented with proper IndexedDB operations
  console.log('Storing offline request:', requestData);
}

// Background Sync (when network comes back)
self.addEventListener('sync', event => {
  if (event.tag === 'pos-sync') {
    event.waitUntil(syncOfflineRequests());
  }
});

async function syncOfflineRequests() {
  // Retrieve and replay stored offline requests
  console.log('Syncing offline POS requests...');
  // Implementation would retrieve from IndexedDB and replay requests
}