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
initFog(map);
console.log("Tabi : Moteur cartographique et Brouillard initialisés.");

// --- 2. GESTION DE L'UTILISATEUR ---
let userMarker = null;

const updateMapLocation = (lat, lng, accuracy) => {
  // 1. On découpe le brouillard
  revealLocation(lat, lng);

  // 2. On affiche le marqueur
  if (!userMarker) {
    // En utilisant un L.marker avec divIcon, le HTML flottera TOUJOURS au dessus du brouillard SVG
    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="user-dot"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(map);
    
    // On dézoome un peu (zoom 14) pour bien voir l'immense trou de 500m
    map.setView([lat, lng], 14); 
  } else {
    userMarker.setLatLng([lat, lng]);
  }
};

const handleGPSError = (message) => {
  console.warn("Tabi GPS:", message);
};

// --- TEST DE SECOURS ---
// Fait apparaître un joueur virtuel à Paris après 1 seconde si le vrai GPS est long
setTimeout(() => {
  if (!userMarker) {
    console.log("Simulation du GPS (Paris) pour tester le brouillard...");
    updateMapLocation(48.8566, 2.3522, 10);
  }
}, 1000);

// --- 3. LANCEMENT DU VRAI GPS ---
initGPS(updateMapLocation, handleGPSError);

// --- 4. PWA ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
