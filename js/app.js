// js/app.js
import { initGPS } from './gps.js';

// --- 1. INITIALISATION DE LA CARTE ---
const initMap = () => {
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

const map = initMap();
console.log("Tabi : Moteur cartographique initialisé.");

// --- 2. GESTION DE L'UTILISATEUR SUR LA CARTE ---
let userMarker = null;

const updateMapLocation = (lat, lng, accuracy) => {
  console.log(`Nouvelle position : ${lat}, ${lng} (Précision: ${accuracy}m)`);

  if (!userMarker) {
    // Premier fix GPS : Création du marqueur de l'utilisateur
    userMarker = L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: "#2563eb",
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 1
    }).addTo(map);

    // On centre et on zoome sur l'utilisateur la première fois
    map.setView([lat, lng], 17);
  } else {
    // Mises à jour suivantes : on déplace juste le marqueur
    userMarker.setLatLng([lat, lng]);
  }
};

const handleGPSError = (message) => {
  console.error("Tabi GPS:", message);
  alert(`Erreur de localisation : ${message}`);
};

// --- 3. LANCEMENT DU GPS ---
initGPS(updateMapLocation, handleGPSError);

// --- 4. SERVICE WORKER (PWA) ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
