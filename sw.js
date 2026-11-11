// QA（マイク対応版）の画面をスマホに保存しておき、次から一瞬で開く（v2.16）。
// 開くときは保存した画面をすぐ出し、裏で GitHub の新しい版を取りに行く。中身が変わっていたら保存し直して、画面に「新しい版が届きました」と知らせる。
// シートの読み書き（script.google.com への送信）には関わらない。
const CACHE = 'qa-v1';
const FILES = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const HOME = new URL('./', self.location).href;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'no-cache' })).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const page = req.mode === 'navigate' || url.href.split(/[?#]/)[0] === HOME || url.pathname.endsWith('/index.html');
  const key = page ? HOME : url.href.split(/[?#]/)[0];
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(key);
    const old = hit ? hit.clone() : null;
    const net = fetch(key, { cache: 'no-cache' }).then(async r => {
      if (r && r.ok) {
        if (page && old) {
          const [a, b] = await Promise.all([old.text(), r.clone().text()]);
          if (a !== b) { await c.put(key, r.clone()); const cs = await self.clients.matchAll({ type: 'window' }); cs.forEach(cl => cl.postMessage({ type: 'updated' })); }
        } else await c.put(key, r.clone());
      }
      return r;
    });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
