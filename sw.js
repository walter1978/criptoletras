const CACHE_VERSION = '1.0.3';
const CACHE_NAME = `cripto-pwa-v${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './icon.png',
    './levels.json',
    './js/texts.js',
    './js/utils.js',
    './ProgressManager.js',
    './js/main.js',
    './js/scenes/BootScene.js',
    './js/scenes/MenuScene.js',
    './js/scenes/ProgressScene.js',
    './js/scenes/GameScene.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('Advertencia al precachear recursos:', err);
            });
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (e) => {
    // Para navegación HTML e index.html: Network First con fallback a Cache
    if (e.request.mode === 'navigate' || e.request.url.includes('index.html')) {
        e.respondWith(
            fetch(e.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
                }
                return networkResponse;
            }).catch(() => caches.match(e.request) || caches.match('./index.html'))
        );
        return;
    }

    // Para el resto de recursos: Stale-While-Revalidate
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
                }
                return networkResponse;
            }).catch(() => null);

            return cachedResponse || fetchPromise;
        })
    );
});

