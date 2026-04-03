// js/app.js
import { initGPS } from './gps.js';
import { initFog, revealLocation } from './fog.js';
import { fetchPOIs } from './api.js'; // ➔ NOUVEL IMPORT
import { initFog, revealLocation, revealMassiveLocation } from './fog.js';

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
  checkProximity(lat, lng);

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

// --- 3. MÉCANIQUE DE DÉCOUVERTE (APPAREIL PHOTO) ---
const cameraBtn = document.getElementById("camera-btn");
const cameraTrigger = document.getElementById("camera-trigger");
const cameraInput = document.getElementById("camera-input");
const cameraPoiName = document.getElementById("camera-poi-name");

let nearbyPOI = null;          // Le monument dont on est proche
const discoveredPOIs = new Set(); // Pour mémoriser ce qu'on a déjà pris en photo

// On relie le beau bouton à l'input système caché
cameraTrigger.addEventListener("click", () => {
  cameraInput.click();
});

// Quand l'utilisateur a pris ou choisi une photo
cameraInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file || !nearbyPOI) return;

  // 1. On valide la découverte
  discoveredPOIs.add(nearbyPOI.id);
  
  // 2. On déclenche l'explosion du brouillard !
  revealMassiveLocation(nearbyPOI.lat, nearbyPOI.lng);
  
  // 3. On cache le bouton et on recentre la carte
  cameraBtn.style.display = "none";
  map.setView([nearbyPOI.lat, nearbyPOI.lng], 15);
  
  alert(`✨ Incroyable ! Vous avez découvert ${nearbyPOI.name} et révélé la zone !`);
  
  // On réinitialise l'input
  cameraInput.value = "";
  nearbyPOI = null;
});

// Le tableau brut des monuments qu'on a téléchargés
let allKnownPOIs = [];

// (Modifie ta fonction loadMonuments existante pour qu'elle alimente allKnownPOIs)
const loadMonuments = async (lat, lng) => {
  console.log("Tabi : Recherche de monuments aux alentours...");
  const pois = await fetchPOIs(lat, lng, 1000); 
  
  pois.forEach(poi => {
    if (!loadedPOIs.has(poi.id)) {
      loadedPOIs.add(poi.id);
      allKnownPOIs.push(poi); // On le garde en mémoire pour calculer la distance

      L.marker([poi.lat, poi.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div class="poi-dot ${discoveredPOIs.has(poi.id) ? 'discovered' : ''}">${poi.icon}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        })
      })
      .bindPopup(`<b>${poi.icon} ${poi.name}</b><br><small>${poi.desc}</small>`)
      .addTo(map);
    }
  });
};

// Fonction pour vérifier si un monument est tout près (dans updateMapLocation)
const checkProximity = (userLat, userLng) => {
  let foundNearby = null;

  for (const poi of allKnownPOIs) {
    // Si déjà découvert, on ignore
    if (discoveredPOIs.has(poi.id)) continue;

    // Turf calcule la distance à vol d'oiseau
    const distance = turf.distance([userLng, userLat], [poi.lng, poi.lat], { units: 'kilometers' });
    
    if (distance <= 0.05) { // 50 mètres
      foundNearby = poi;
      break; 
    }
  }

  if (foundNearby) {
    nearbyPOI = foundNearby;
    cameraPoiName.textContent = foundNearby.name;
    cameraBtn.style.display = "block"; // Affiche le bouton !
  } else {
    nearbyPOI = null;
    cameraBtn.style.display = "none";
  }
};

initGPS(updateMapLocation, handleGPSError);
