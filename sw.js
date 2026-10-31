/* Service worker D&D: funzionamento offline.
   Strategia: cache-first con aggiornamento in background (stale-while-revalidate).
   Incrementare CACHE solo se si aggiungono/rimuovono file in ASSETS. */
const CACHE = 'dnd-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? './index.html' : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req)
      .then(r => { if (r && r.ok) cache.put(key, r.clone()); return r; })
      .catch(() => null);
    if (cached) { e.waitUntil(net); return cached; }
    return (await net) || Response.error();
  })());
});
