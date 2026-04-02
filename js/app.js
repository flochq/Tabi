// js/app.js
import { initGPS } from './gps.js';
import { initFog, revealLocation } from './fog.js';

// --- 1. INITIALISATION DE LA CARTE ---
const initMap = () => {
  const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([48.8566, 2.3522], 14);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  return map;
};

const map = initMap();

// ➔ NOUVEAU : On initialise le brouillard géant par dessus la carte
initFog(map);

console.log("Tabi : Moteur cartographique et Brouillard initialisés.");

// --- 2. GESTION DE L'UTILISATEUR ---
let userMarker = null;

const updateMapLocation = (lat, lng, accuracy) => {
  // On dissipe le brouillard autour de la nouvelle position
  revealLocation(lat, lng);

  if (!userMarker) {
    userMarker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: "#2563eb",
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 1
    }).addTo(map);
    map.setView([lat, lng], 17);
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  // ➔ CRUCIAL : On force le marqueur à passer au-dessus du brouillard
  userMarker.bringToFront();
};

const handleGPSError = (message) => {
  console.error("Tabi GPS:", message);
};

// --- 3. LANCEMENT DU GPS ---
initGPS(updateMapLocation, handleGPSError);

// --- 4. PWA ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
