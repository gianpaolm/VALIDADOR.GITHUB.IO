/* Cachea la app para que funcione sin señal. Al publicar una versión nueva,
   subí el número de VERSION para que los teléfonos la tomen. */
const VERSION = "v1";
const CACHE = "validador-" + VERSION;

const ARCHIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./iconos/icono.svg",
  "./iconos/icono-192.png",
  "./iconos/icono-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
