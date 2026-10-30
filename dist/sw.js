const CACHE_NAME = 'mare-certa-pwa-v5';
const IS_LOCAL = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
const CORE_ASSETS = ['./', './index.html', './styles.css', './versao-b.css', './app-b.js', './preview-b.js', './marine-b.js', './tides.js', './conditions.js', './tabs.js', './assets/pwa-app-icon.jpg'];
self.addEventListener('install', event => {
  if (!IS_LOCAL) {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => {}));
  }
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => IS_LOCAL || k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        if (IS_LOCAL) {
          return self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => client.navigate(client.url));
          });
        }
      })
  );
});
self.addEventListener('fetch', event => {
  if (IS_LOCAL || event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
