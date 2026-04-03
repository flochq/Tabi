// js/app.js
import { initGPS } from './gps.js';
import { initFog, revealLocation, revealMassiveLocation, getExploredArea } from './fog.js';
import { fetchPOIs, fetchCityBoundary } from './api.js';
import { updateGachaDistance } from './gacha.js';

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
initFog(map); // Initialise le brouillard (charge IndexedDB)

// --- VARIABLES D'ÉTAT ---
let userMarker = null;
let lastFetchPos = null;
const loadedPOIs = new Set();
const discoveredPOIs = new Set();
let allKnownPOIs = [];
let nearbyPOI = null;
let cityBoundary = null;
let cityArea = 0;

// --- RÉFÉRENCES DOM ---
const cameraBtn = document.getElementById("camera-btn");
const cameraTrigger = document.getElementById("camera-trigger");
const cameraInput = document.getElementById("camera-input");
const cameraPoiName = document.getElementById("camera-poi-name");

// --- 2. LOGIQUE DES STATISTIQUES ---
const updateStats = () => {
  // Mise à jour du compteur de monuments
  const statPois = document.getElementById("stat-pois");
  if (statPois) statPois.textContent = discoveredPOIs.size;

  // Calcul du % de ville découverte
  if (cityBoundary) {
    const explored = getExploredArea();
    let pct = 0;
    
    if (explored) {
      try {
        const intersection = turf.intersect(explored, cityBoundary.polygon);
        if (intersection) {
          const exploredAreaKm2 = turf.area(intersection) / 1e6;
          pct = (exploredAreaKm2 / cityArea) * 100;
        }
      } catch (e) {
        console.warn("Tabi : Erreur de calcul géospatial pour les stats", e);
      }
    }
    
    const statCoverage = document.getElementById("stat-coverage");
    if (statCoverage) {
      statCoverage.textContent = pct < 0.1 ? "<0.1%" : pct.toFixed(1) + "%";
    }
  }
};

// --- 3. LOGIQUE APPAREIL PHOTO ---
if (cameraTrigger && cameraInput) {
  cameraTrigger.addEventListener("click", () => {
    cameraInput.click();
  });

  cameraInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file || !nearbyPOI) return;

    // Marquer comme découvert et explosion du brouillard (350m)
    discoveredPOIs.add(nearbyPOI.id);
    revealMassiveLocation(nearbyPOI.lat, nearbyPOI.lng);
    
    if (cameraBtn) cameraBtn.style.display = "none";
    map.setView([nearbyPOI.lat, nearbyPOI.lng], 15);
    
    alert(`✨ Incroyable ! Vous avez découvert ${nearbyPOI.name} et révélé la zone !`);
    
    cameraInput.value = "";
    nearbyPOI = null;
    updateStats();
  });
}

// --- 4. GESTION DES MONUMENTS (POI) ---
const loadMonuments = async (lat, lng) => {
  const pois = await fetchPOIs(lat, lng, 1000); 
  
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
      .bindPopup(`<b>${poi.icon} ${poi.name}</b>`)
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

  if (foundNearby) {
    nearbyPOI = foundNearby;
    if (cameraPoiName) cameraPoiName.textContent = foundNearby.name;
    if (cameraBtn) cameraBtn.style.display = "block";
  } else {
    nearbyPOI = null;
    if (cameraBtn) cameraBtn.style.display = "none";
  }
};

// --- 5. CALLBACK PRINCIPAL GPS ---
const updateMapLocation = (lat, lng, accuracy) => {
  // Dissipation du brouillard
  revealLocation(lat, lng);
  
  // Vérification proximité monuments
  checkProximity(lat, lng);

  // Mise à jour du marqueur joueur
  if (!userMarker) {
    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="user-dot"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(map);
    map.setView([lat, lng], 16);
  } else {
    userMarker.setLatLng([lat, lng]);
  }

  // Récupération des frontières de la ville au premier fix
  if (!cityBoundary) {
    fetchCityBoundary(lat, lng).then(data => {
      if (data) {
        cityBoundary = data;
        cityArea = data.area;
        
        document.getElementById("city-name").textContent = data.name;
        document.getElementById("stat-city-chip").style.display = "flex";

        L.geoJSON(data.polygon, {
          style: { color: "#2563eb", weight: 2.5, fillOpacity: 0, dashArray: "8,5" }
        }).addTo(map);
        
        updateStats();
      }
    });
  }

  // Téléchargement POI tous les 500m
  const currentLatLng = L.latLng(lat, lng);
  if (!lastFetchPos || lastFetchPos.distanceTo(currentLatLng) > 500) {
    lastFetchPos = currentLatLng;
    loadMonuments(lat, lng);
  }

  updateStats();
};

// --- 6. LANCEMENT ET PWA ---
initGPS(updateMapLocation, (msg) => console.warn("GPS:", msg));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
