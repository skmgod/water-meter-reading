// 빠른 실행: 저장된 앱을 바로 보여주고, 인터넷이 되면 뒤에서 새 버전으로 갱신 (다음 실행부터 적용)
const CACHE = 'water-meter-v2';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request)
      .then(async res => {
        if (res.ok) {
          // 화면(index.html)이 바뀌었으면 앱에 "새 버전" 알림
          if (cached && e.request.mode === 'navigate') {
            const [a, b] = await Promise.all([cached.clone().text(), res.clone().text()]);
            if (a !== b) self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage('updated')));
          }
          await cache.put(e.request, res.clone());
        }
        return res;
      })
      .catch(() => cached);
    if (cached) { e.waitUntil(fresh); return cached; }
    return fresh;
  }));
});
