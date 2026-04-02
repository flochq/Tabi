// Initialisation basique de la carte centrée sur Paris
const map = L.map("map", { zoomControl: false, attributionControl: false }).setView([48.8566, 2.3522], 13);
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { 
    maxZoom: 19, 
    subdomains: "abcd" 
}).addTo(map);

// Enregistrement du Service Worker (Obligatoire pour la PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => console.log("Service Worker enregistré avec succès.", reg))
      .catch(err => console.warn("Échec de l'enregistrement du Service Worker", err));
  });
}
