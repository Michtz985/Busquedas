// Service worker: permite instalar la app y usarla sin conexión.
// Si cambias algún archivo, sube el número de VERSION para renovar la caché.
const VERSION = "grafo-v2";
const ARCHIVOS = [
  "./", 
  "./index.html",
  "./style.css", 
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png", 
  "./icons/icon-512.png", 
  "./icons/icon-maskable-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Red primero (siempre la versión más nueva); sin red, usa la caché.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copia = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copia));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
