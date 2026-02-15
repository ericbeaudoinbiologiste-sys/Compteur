// sw.js — PWA cache versionné
const VERSION = "v13.02";
const CACHE = `timer-${VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: pré-cache
self.addEventListener("install", (event) => {
  self.skipWaiting(); // devient actif tout de suite
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: supprime anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim(); // contrôle les pages ouvertes
  })());
});

// Fetch: stale-while-revalidate pour les assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    // Réseau en arrière-plan pour mettre à jour
    const fetchPromise = fetch(req).then((res) => {
      // cache seulement les réponses valides
      if (res && res.status === 200 && res.type === "basic") {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => cached); // offline -> cache

    // Répond vite avec cache si dispo, sinon réseau
    return cached || fetchPromise;
  })());
});
