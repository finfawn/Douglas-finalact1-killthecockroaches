const CACHE_NAME = 'kill-the-cockroaches-v1';
const ASSETS_CACHE = 'assets-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/game.js',
  '/styles.css',
  '/manifest.json',
  '/game-icon.png',
  '/cursor.png',
  '/roach.png',
  '/roach-dead.png',
  '/background.jpg',
  '/game-music-loop-4-144341.mp3',
  '/hard-slap-46388.mp3',
  '/tomato-squishwet-103934.mp3'
];

// Install event - cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Ensure new service worker activates immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== ASSETS_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();

            // Add the new file to cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, return a custom offline page or asset
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // Return a default offline asset for other resources
            return new Response('Offline content not available');
          });
      })
  );
}); 