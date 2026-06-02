const CACHE_NAME = 'rhythm-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(cached => {
    if (cached) {
      fetch(e.request).then(resp => {
        if (resp && resp.status === 200) caches.open(CACHE_NAME).then(c => c.put(e.request, resp.clone()));
      }).catch(()=>{});
      return cached;
    }
    return fetch(e.request).then(resp => {
      if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return resp;
    });
  }));
});