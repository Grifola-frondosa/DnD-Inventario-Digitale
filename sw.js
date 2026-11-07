/* Service worker D&D: funzionamento offline e avvio istantaneo.
   Strategia: cache prima, aggiornamento in background (stale-while-revalidate).
   - L'app si apre SEMPRE subito dalla copia in cache, senza attendere la rete (nessun ritardo, nemmeno con rete lenta).
   - In parallelo, ogni avvio scarica la versione più recente (bypassa la cache HTTP di GitHub Pages) e la salva:
     la nuova versione viene mostrata all'avvio successivo.
   - Prima installazione o file non in cache: si usa la rete.
   Incrementare CACHE se si aggiungono/rimuovono file in ASSETS. */
const CACHE = 'dnd-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
const CRITICAL = ['./', './index.html', './manifest.webmanifest'];

/* Precache tollerante: un file mancante tra le icone non deve più far fallire l'installazione (addAll è tutto-o-niente);
   falliscono l'installazione solo i file critici. */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await Promise.allSettled(ASSETS.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    const bad = ASSETS.filter((u, i) => res[i].status === 'rejected' && CRITICAL.includes(u));
    if (bad.length) throw new Error('Precache fallito: ' + bad.join(', '));
    await self.skipWaiting();
  })());
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
      if (r.ok) cache.put(key, r.clone());
      return r;
    });
    if (cached) { e.waitUntil(net.catch(() => {})); return cached; }
    return net.catch(() => Response.error());
  })());
});
