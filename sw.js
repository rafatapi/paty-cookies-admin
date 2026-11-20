const scope = new URL(self.registration.scope);
const cachePrefix = 'cookies-paty:' + scope.pathname + ':';
const cacheName = cachePrefix + 'v4';
const entry = new URL('index.html', scope).href;
const assets = new Set([
  'index.html',
  'styles.css',
  'recipes.js',
  'app.js',
  'admin.css',
  'catalog.js',
  'admin-business.js',
  'admin-store.js',
  'admin-ui.js',
  'manifest.webmanifest',
  'assets/logo.png',
  'assets/icon-180.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
].map(path => new URL(path, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...assets].map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  const isHome = request.mode === 'navigate' && url.href === scope.href;
  const asset = isHome ? entry : url.href;
  if (!assets.has(asset)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(asset) ?? fetch(request);
  })());
});