// ============================================================
// sw.js - Service Worker(オフライン対応)
// アプリのファイルをキャッシュし、ネットがなくても起動できるように。
// データ(IndexedDB)は元々端末内なのでオフラインでも読み書き可能。
// ============================================================

const CACHE = 'assistant-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/css/style.css',
  './src/js/app.js',
  './src/js/db.js',
  './src/js/util.js',
  './src/js/ui.js',
  './src/js/attachments.js',
  './src/js/views/home.js',
  './src/js/views/calendar.js',
  './src/js/views/money.js',
  './src/js/views/todo.js',
  './src/js/views/memo.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// cache-first。取れなければネット。更新はネット優先で裏側キャッシュ更新。
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
