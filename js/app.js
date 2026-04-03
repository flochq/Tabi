// js/app.js
import { initGPS } from './gps.js';
import { initFog, revealLocation, revealMassiveLocation } from './fog.js';
import { fetchPOIs } from './api.js';

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

// --- VARIABLES GLOBALES ---
let userMarker = null;
let lastFetchPos = null;
const loadedPOIs = new Set();
const discoveredPOIs = new Set();
let allKnownPOIs = [];
let nearbyPOI = null;

// --- ELEMENTS DOM ---
const cameraBtn = document.getElementById("camera-btn");
const cameraTrigger = document.getElementById("camera-trigger");
const cameraInput = document.getElementById("camera-input");
const cameraPoiName = document.getElementById("camera-poi-name");

// --- 2. LOGIQUE APPAREIL PHOTO ---
// Sécurité : on vérifie que les éléments existent bien dans index.html
if (cameraTrigger && cameraInput) {
  cameraTrigger.addEventListener("click", () => {
    cameraInput.click();
  });

  cameraInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file || !nearbyPOI) return;

    discoveredPOIs.add(nearbyPOI.id);
    
    // Révélation massive de 350 mètres !
    revealMassiveLocation(nearbyPOI.lat, nearbyPOI.lng);
    
    if (cameraBtn) cameraBtn.style.display = "none";
    map.setView([nearbyPOI.lat, nearbyPOI.lng], 15);
    
    alert(`✨ Incroyable ! Vous avez découvert ${nearbyPOI.name} et révélé la zone !`);
    
    cameraInput.value = "";
    nearbyPOI = null;
  });
}

// --- 3. GESTION DES MONUMENTS ---
const loadMonuments = async (lat, lng) => {
  console.log("Tabi : Recherche de monuments aux alentours...");
  const pois = await fetchPOIs(lat, lng, 1000); 
  
// ➔ AJOUTE CECI POUR DEBUGGER
  console.log(`Tabi : J'ai trouvé ${pois.length} monuments autour de toi !`, pois);
  
  pois.forEach(poi => {
    if (!loadedPOIs.has(poi.id)) {
      loadedPOIs.add(poi.id);
      allKnownPOIs.push(poi);

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

const checkProximity = (userLat, userLng) => {
  let foundNearby = null;

  for (const poi of allKnownPOIs) {
    if (discoveredPOIs.has(poi.id)) continue;

    const distance = turf.distance([userLng, userLat], [poi.lng, poi.lat], { units: 'kilometers' });
    
    if (distance <= 0.05) { // 50 mètres
      foundNearby = poi;
      break; 
    }
  }

  // Affichage ou masquage du bouton de l'appareil photo
  if (foundNearby) {
    nearbyPOI = foundNearby;
    if (cameraPoiName) cameraPoiName.textContent = foundNearby.name;
    if (cameraBtn) cameraBtn.style.display = "block";
  } else {
    nearbyPOI = null;
    if (cameraBtn) cameraBtn.style.display = "none";
  }
};

// --- 4. GESTION DU JOUEUR (LA FONCTION QUE TU DEMANDAIS) ---
const updateMapLocation = (lat, lng, accuracy) => {
  
  // A. On dissipe le brouillard
  revealLocation(lat, lng);

  // B. On vérifie si un monument est proche
  checkProximity(lat, lng);

  // C. On met à jour le point bleu
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

  // D. On télécharge les nouveaux monuments si on a marché 500m
  const currentLatLng = L.latLng(lat, lng);
  if (!lastFetchPos || lastFetchPos.distanceTo(currentLatLng) > 500) {
    lastFetchPos = currentLatLng;
    loadMonuments(lat, lng);
  }
};

// --- 5. LANCEMENT ---
initGPS(updateMapLocation, (msg) => console.warn("GPS:", msg));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
