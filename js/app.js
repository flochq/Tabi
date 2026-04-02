// js/app.js

const initMap = () => {
  // On désactive les contrôles par défaut pour garder une UI mobile propre
  const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([48.8566, 2.3522], 14); // Paris par défaut

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  return map;
};

// Démarrage de l'application
const map = initMap();
console.log("Tabi : Moteur cartographique initialisé depuis zéro.");

// Enregistrement PWA très basique
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
