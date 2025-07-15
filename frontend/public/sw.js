// CryptoGift Wallets Service Worker
const CACHE_NAME = 'cg-wallets-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/images/cg-wallet-logo.png',
  '/images/nft-placeholder.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return a basic offline response for API requests
          return new Response(JSON.stringify({
            error: 'Offline',
            message: 'Esta función requiere conexión a internet'
          }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          });
        })
    );
    return;
  }

  // Handle static assets and pages
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // Return placeholder for images
            if (event.request.url.includes('.png') || event.request.url.includes('.jpg')) {
              return caches.match('/images/nft-placeholder.png');
            }
            
            // Generic offline response
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Handle PWA install prompt
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('💡 PWA install prompt available');
  event.preventDefault();
  // Store the event for later use
  self.deferredPrompt = event;
});

// Handle PWA app install
self.addEventListener('appinstalled', (event) => {
  console.log('📱 PWA installed successfully');
  self.deferredPrompt = null;
});

// Handle background sync for offline transactions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'wallet-sync') {
    event.waitUntil(syncWalletData());
  }
});

async function syncWalletData() {
  try {
    console.log('🔄 Syncing wallet data...');
    // Here you would sync any pending transactions or wallet state
    // This is where you'd implement offline transaction queuing
    console.log('✅ Wallet data synced');
  } catch (error) {
    console.error('❌ Wallet sync failed:', error);
  }
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva actividad en tu CG Wallet',
    icon: '/images/cg-wallet-logo.png',
    badge: '/images/cg-wallet-logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir Wallet',
        icon: '/images/cg-wallet-logo.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/images/cg-wallet-logo.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CryptoGift Wallet', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/my-wallets')
    );
  }
});