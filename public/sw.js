// Enhanced Service Worker for Cross-Platform Push Notifications - v2.2 iOS PWA Fix
const CACHE_VERSION = 'v2.2-ios-pwa-fix-20250630';
const CACHE_NAME = `gokul-wholesale-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  console.log('Service Worker installed - iOS PWA Fix v2.2');
  // iOS PWA compatibility: Skip waiting for immediate activation
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated - iOS PWA Fix v2.2');
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.filter(cacheName => 
            cacheName.startsWith('gokul-wholesale-') && cacheName !== CACHE_NAME
          ).map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // iOS PWA: Immediate client control
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker ready for iOS PWA');
    })
  );
});

// Handle push notifications with enhanced cross-platform support
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  // Default notification options optimized for all platforms
  const defaultOptions = {
    body: 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200], // Enhanced vibration for Android/Samsung
    data: {
      url: '/',
    },
    requireInteraction: false, // Auto-close for better UX
    silent: false,
    tag: 'gokul-wholesale', // Prevent duplicate notifications
    renotify: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  let title = 'Gokul Wholesale';
  let options = { ...defaultOptions };

  // Parse notification data with fallbacks for different formats
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('Notification payload:', payload);
      
      // Handle different payload formats from different platforms
      title = payload.title || payload.notification?.title || 'Gokul Wholesale';
      
      options.body = payload.body || 
                    payload.message || 
                    payload.notification?.body || 
                    'You have a new notification';
                    
      options.icon = payload.icon || 
                    payload.notification?.icon || 
                    '/favicon.png';
                    
      options.data = {
        url: payload.url || payload.data?.url || payload.click_action || '/',
        orderId: payload.orderId || payload.data?.orderId,
        type: payload.type || payload.data?.type || 'general'
      };

      // Enhanced options for specific notification types
      if (payload.type === 'order_note' || payload.type === 'new_order') {
        options.requireInteraction = true; // Keep important notifications visible
        options.vibrate = [300, 100, 300, 100, 300]; // More prominent vibration
      }
      
    } catch (error) {
      console.error('Error parsing notification payload:', error);
      // Use defaults if parsing fails
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks with iOS PWA compatibility
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Handle different action types
  if (event.action === 'dismiss') {
    return; // Just close the notification
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // For iOS PWA, prefer focusing existing clients
        const visibleClient = clients.find((client) => client.visibilityState === 'visible');
        
        if (visibleClient) {
          // iOS PWA: Focus and navigate existing window
          if ('navigate' in visibleClient) {
            visibleClient.navigate(urlToOpen);
          }
          return visibleClient.focus();
        }
        
        // Check for any client with the target URL
        const targetClient = clients.find((client) => client.url.includes(urlToOpen));
        if (targetClient && 'focus' in targetClient) {
          return targetClient.focus();
        }
        
        // Open new window if no existing client found
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// Handle background sync (for offline capabilities)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Here you could sync any pending notifications
      console.log('Syncing notifications...')
    );
  }
});