/* Service worker per la PWA "D&D".
 * Incrementare CACHE_VERSION a ogni rilascio che modifica i file in PRECACHE
 * (e aggiornare VERSION in index.html). */
const CACHE_VERSION = 'v2';
const CACHE_NAME = 'dnd-' + CACHE_VERSION;
const NAV_TIMEOUT_MS = 3000;

/* File indispensabili: se uno manca l'installazione fallisce (e si nota). */
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest'
];
/* Icone: un 404 non deve impedire l'installazione, ma viene segnalato in console. */
const ICONS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

/* cache: 'reload' evita di precaricare copie obsolete dalla cache HTTP del browser. */
const fresh = (url) => new Request(url, { cache: 'reload' });

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE.map(fresh));
    await Promise.all(ICONS.map((url) =>
      cache.add(fresh(url)).catch((err) => console.warn('[sw] precache non riuscito:', url, err))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('dnd-') && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Navigazione: rete con timeout, fallback sulla cache (funziona offline). */
async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response && response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch (err) {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  } finally {
    clearTimeout(timer);
  }
}

/* Altre risorse same-origin: stale-while-revalidate. */
async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  } else {
    event.respondWith(handleAsset(request));
  }
});
