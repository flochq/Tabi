// js/app.js
import { initGPS } from './gps.js';
import { initFog, revealLocation, revealMassiveLocation, getExploredArea } from './fog.js';
import { fetchPOIs, fetchCityBoundary } from './api.js';
import { updateGachaDistance, awardCityCompletion } from './gacha.js';
import { fetchWalkingRoute } from './routing.js';
import { initMissions, updateMissionProgress } from './missions.js';

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
initMissions();

// --- VARIABLES D'ÉTAT GLOBALES ---
let userMarker = null;
let lastFetchPos = null;
const loadedPOIs = new Set();
const discoveredPOIs = new Set();
let allKnownPOIs = [];
let nearbyPOI = null;
let cityBoundary = null;
let cityArea = 0;

let isFetchingCity = false;
let isFetchingPOIs = false;

let totalDistWalked = parseFloat(localStorage.getItem("tabi-dist")) || 0;
let lastGpsPos = null;
let currentRouteLayer = null;

const cameraBtn = document.getElementById("camera-btn");
const cameraTrigger = document.getElementById("camera-trigger");
const cameraInput = document.getElementById("camera-input");
const cameraPoiName = document.getElementById("camera-poi-name");

// --- 2. LOGIQUE DES STATISTIQUES ET VÉRIFICATION 100% ---
const updateStats = () => {
  if (cityBoundary) {
    const explored = getExploredArea();
    let pct = 0;
    
    if (explored) {
      try {
        const intersection = turf.intersect(explored, cityBoundary.polygon);
        if (intersection) {
          const exploredAreaKm2 = turf.area(intersection) / 1e6;
          pct = (exploredAreaKm2 / cityArea) * 100;
          
          updateMissionProgress('coverage', pct, true); 
          
          // ➔ LA FAMEUSE VÉRIFICATION DES 99% DE LA VILLE
          if (pct >= 0.1) {
            checkCityCompletion(cityBoundary.name, cityBoundary.polygon, lastGpsPos.lat, lastGpsPos.lng);
          }
        }
      } catch (e) {
        // Ignorer les erreurs
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

    updateMissionProgress('photo', 1);

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
  if (isFetchingPOIs) return; 
  isFetchingPOIs = true;

  const pois = await fetchPOIs(lat, lng, 1000); 
  
  if (!pois || pois.length === 0) {
    isFetchingPOIs = false;
    lastFetchPos = null;
    return;
  }

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

  lastFetchPos = L.latLng(lat, lng);
  isFetchingPOIs = false; 
};

const checkProximity = (userLat, userLng) => {
  let foundNearby = null;

  for (const poi of allKnownPOIs) {
    if (discoveredPOIs.has(poi.id)) continue;
    const distance = turf.distance([userLng, userLat], [poi.lng, poi.lat], { units: 'kilometers' });
    
    if (distance <= 0.05) {
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

// --- 5. LOGIQUE DU PLANIFICATEUR D'ITINÉRAIRES ---
window.suggestRoute = async () => {
  if (!lastGpsPos) return alert("📍 En attente du signal GPS...");

  const undiscovered = allKnownPOIs.filter(p => !discoveredPOIs.has(p.id));
  if (undiscovered.length === 0) {
    return alert("Vous avez découvert tous les monuments aux alentours.");
  }

  undiscovered.forEach(p => {
    p.distToUser = turf.distance([lastGpsPos.lng, lastGpsPos.lat], [p.lng, p.lat]);
  });
  undiscovered.sort((a, b) => a.distToUser - b.distToUser);

  const targets = undiscovered.slice(0, 3);
  const coords = [[lastGpsPos.lng, lastGpsPos.lat], ...targets.map(t => [t.lng, t.lat])];

  const navIcon = document.getElementById("route-nav-icon");
  const navLabel = document.getElementById("route-nav-label");
  if(navIcon) navIcon.textContent = "⏳";
  if(navLabel) navLabel.textContent = "Calcul...";
  
  const route = await fetchWalkingRoute(coords);
  
  if(navIcon) navIcon.textContent = "🧭";
  if(navLabel) navLabel.textContent = "Balade";

  if (!route) return alert("Impossible de calculer l'itinéraire dans cette zone.");

  if (currentRouteLayer) map.removeLayer(currentRouteLayer);
  
  currentRouteLayer = L.geoJSON(route.geometry, {
    style: { color: "#38bdf8", weight: 5, opacity: 0.9, dashArray: "10, 15", lineCap: "round" }
  }).addTo(map);

  map.fitBounds(currentRouteLayer.getBounds(), { padding: [50, 50], animate: true });

  document.getElementById("route-info").style.display = "flex";
  
  const distanceKm = route.distance / 1000;
  document.getElementById("route-dist").textContent = distanceKm.toFixed(1);
  const walkTimeMinutes = Math.round(distanceKm * 15);
  document.getElementById("route-time").textContent = walkTimeMinutes;
};

window.clearRoute = () => {
  if (currentRouteLayer) map.removeLayer(currentRouteLayer);
  currentRouteLayer = null;
  document.getElementById("route-info").style.display = "none";
  if (lastGpsPos) map.setView([lastGpsPos.lat, lastGpsPos.lng], 16);
};

// --- 6. CALLBACK PRINCIPAL GPS ---
const updateMapLocation = (lat, lng, accuracy) => {

  if (lastGpsPos) {
    const distanceKm = turf.distance([lastGpsPos.lng, lastGpsPos.lat], [lng, lat], { units: 'kilometers' });
    if (distanceKm > 0.005) {
      totalDistWalked += distanceKm;
      
      updateMissionProgress('distance', distanceKm);
      localStorage.setItem("tabi-dist", totalDistWalked.toString());
      updateGachaDistance(totalDistWalked);
    }
  }
  lastGpsPos = { lat, lng };

  revealLocation(lat, lng);
  checkProximity(lat, lng);

  if (!userMarker) {
    userMarker = L.marker([lat, lng], {
      zIndexOffset: 1000,
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

  if (!cityBoundary && !isFetchingCity) {
    isFetchingCity = true;
    fetchCityBoundary(lat, lng).then(data => {
      if (data) {
        cityBoundary = data;
        cityArea = data.area;
        
        const cityNameEl = document.getElementById("city-name");
        if (cityNameEl) cityNameEl.textContent = data.name;

        L.geoJSON(data.polygon, {
          style: { color: "#2563eb", weight: 2.5, fillOpacity: 0, dashArray: "8,5" }
        }).addTo(map);
        
        updateStats();
      } else {
        isFetchingCity = false;
      }
    }).catch(() => isFetchingCity = false);
  }

  const currentLatLng = L.latLng(lat, lng);
  if (!lastFetchPos || lastFetchPos.distanceTo(currentLatLng) > 500) {
    loadMonuments(lat, lng);
  }

  updateStats();
};

// --- SÉCURITÉ ANTI-DOUBLON POUR LA VICTOIRE 100% ---
function checkCityCompletion(cityName, polygon, lat, lng) {
  const COMPLETION_KEY = "tabi-completed-cities";
  let completed = JSON.parse(localStorage.getItem(COMPLETION_KEY)) || [];
  
  if (completed.includes(cityName)) return; // On empêche de gagner la carte en boucle

  completed.push(cityName);
  localStorage.setItem(COMPLETION_KEY, JSON.stringify(completed));
  
  awardCityCompletion(cityName, polygon, lat, lng);
}

// --- 7. LANCEMENT ET PWA ---
initGPS(updateMapLocation, (msg) => console.warn("GPS:", msg));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
