const CACHE_NAME = 'game-atlas-v1';
const ASSETS = [
    './',
    './index.html',
    './src/css/style.css',
    './src/js/app.js',
    './manifest.json',
    './data/data.json',
    './src/img/icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
