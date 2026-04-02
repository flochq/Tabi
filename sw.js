const CACHE_NAME = "tabi-v1";

// Installation du service worker
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installé");
  self.skipWaiting();
});

// Activation
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activé");
  event.waitUntil(clients.claim());
});

// Interception des requêtes réseau (vide pour l'instant)
self.addEventListener("fetch", (event) => {
  // Plus tard, nous mettrons la logique de cache ici
});
