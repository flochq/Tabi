// js/app.js
import { initGPS } from './gps.js';
import { initFog, revealLocation } from './fog.js';
import { fetchPOIs } from './api.js'; // ➔ NOUVEL IMPORT

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

// --- 2. GESTION DE L'UTILISATEUR ET DES MONUMENTS ---
let userMarker = null;
let lastFetchPos = null;       // Garde en mémoire le dernier point où on a téléchargé les monuments
const loadedPOIs = new Set();  // Garde une trace des IDs des monuments déjà affichés pour éviter les doublons

// Fonction pour afficher les monuments sur la carte
const loadMonuments = async (lat, lng) => {
  console.log("Tabi : Recherche de monuments aux alentours...");
  const pois = await fetchPOIs(lat, lng, 1000); // Rayon de 1km

  pois.forEach(poi => {
    // Si on n'a pas encore affiché ce monument
    if (!loadedPOIs.has(poi.id)) {
      loadedPOIs.add(poi.id);

      // On l'ajoute sur la carte Leaflet
      L.marker([poi.lat, poi.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div class="poi-dot">${poi.icon}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        })
      })
      .bindPopup(`<b>${poi.icon} ${poi.name}</b><br><small>${poi.desc}</small>`)
      .addTo(map);
    }
  });
};

const updateMapLocation = (lat, lng, accuracy) => {
  revealLocation(lat, lng);

  if (!userMarker) {
    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="user-dot"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(map);
    map.setView([lat, lng], 14);
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  // ➔ NOUVEAU : Logique de téléchargement optimisée
  const currentLatLng = L.latLng(lat, lng);
  
  // Si c'est le premier lancement, OU si on a marché plus de 500 mètres depuis la dernière requête
  if (!lastFetchPos || lastFetchPos.distanceTo(currentLatLng) > 500) {
    lastFetchPos = currentLatLng;
    loadMonuments(lat, lng);
  }
};

const handleGPSError = (message) => {
  console.warn("Tabi GPS:", message);
};

initGPS(updateMapLocation, handleGPSError);
