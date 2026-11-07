/* Service worker D&D: funzionamento offline.
   Strategia: rete prima, cache come ripiego (network-first).
   - Online: ogni avvio scarica la versione più recente (revalidazione, bypassa la cache HTTP di GitHub Pages) e la salva.
   - Offline o rete lenta (> TIMEOUT ms): si usa la copia in cache.
   Incrementare CACHE se si aggiungono/rimuovono file in ASSETS. */
const CACHE = 'dnd-v3';
const TIMEOUT = 3000;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
    const net = fetch(req.url, { cache: 'no-cache' }).then(r => {
      if (!r.ok) return cached || r;
      cache.put(key, r.clone());
      return r;
    });
    if (!cached) return net.catch(() => Response.error());
    e.waitUntil(net.catch(() => {}));
    return Promise.race([
      net.catch(() => cached),
      new Promise(res => setTimeout(() => res(cached), TIMEOUT))
    ]);
  })());
});
