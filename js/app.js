// js/app.js
import { initGPS } from './gps.js';
import { initFog, revealLocation, revealMassiveLocation, getExploredArea } from './fog.js';
import { fetchPOIs, fetchCityBoundary } from './api.js';
import { updateGachaDistance } from './gacha.js'; // ➔ Import du Gacha
import { fetchWalkingRoute } from './routing.js';

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

// --- VARIABLES D'ÉTAT GLOBALES ---
let userMarker = null;
let lastFetchPos = null;
const loadedPOIs = new Set();
const discoveredPOIs = new Set();
let allKnownPOIs = [];
let nearbyPOI = null;
let cityBoundary = null;
let cityArea = 0;
let currentRouteLayer = null;

// Variables du podomètre
let totalDistWalked = parseFloat(localStorage.getItem("tabi-dist")) || 0;
let lastGpsPos = null;

// --- RÉFÉRENCES DOM ---
const cameraBtn = document.getElementById("camera-btn");
const cameraTrigger = document.getElementById("camera-trigger");
const cameraInput = document.getElementById("camera-input");
const cameraPoiName = document.getElementById("camera-poi-name");

// --- 2. LOGIQUE DES STATISTIQUES ---
const updateStats = () => {
  const statPois = document.getElementById("stat-pois");
  if (statPois) statPois.textContent = discoveredPOIs.size;

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

// --- LOGIQUE DU PLANIFICATEUR D'ITINÉRAIRES ---
window.suggestRoute = async () => {
  if (!lastGpsPos) return alert("📍 En attente du signal GPS, marchez un peu...");

  // 1. Filtrer les monuments qui n'ont PAS encore été découverts
  const undiscovered = allKnownPOIs.filter(p => !discoveredPOIs.has(p.id));
  if (undiscovered.length === 0) {
    return alert("Bravo ! Vous avez découvert tous les monuments aux alentours. Éloignez-vous pour en charger de nouveaux.");
  }

  // 2. Trier ces monuments par distance par rapport au joueur
  undiscovered.forEach(p => {
    p.distToUser = turf.distance([lastGpsPos.lng, lastGpsPos.lat], [p.lng, p.lat]);
  });
  undiscovered.sort((a, b) => a.distToUser - b.distToUser);

  // 3. Sélectionner jusqu'à 3 monuments (les plus proches) pour faire un joli parcours
  const targets = undiscovered.slice(0, 3);
  
  // Format [longitude, latitude] pour l'API
  const coords = [[lastGpsPos.lng, lastGpsPos.lat], ...targets.map(t => [t.lng, t.lat])];

  // 4. Appel de l'API de routage
  const btn = document.getElementById("route-btn");
  btn.textContent = "⏳ Calcul...";
  const route = await fetchWalkingRoute(coords);
  btn.textContent = "🧭 Suggérer une balade";

  if (!route) return alert("Impossible de calculer l'itinéraire dans cette zone.");

  // 5. Affichage du tracé sur la carte
  if (currentRouteLayer) map.removeLayer(currentRouteLayer);
  
  currentRouteLayer = L.geoJSON(route.geometry, {
    style: { color: "#38bdf8", weight: 5, opacity: 0.9, dashArray: "10, 15", lineCap: "round" }
  }).addTo(map);

  // Animation sympa : on recule la caméra pour voir tout le trajet
  map.fitBounds(currentRouteLayer.getBounds(), { padding: [50, 50], animate: true });

// 6. Mise à jour de l'Interface
  document.getElementById("route-btn").style.display = "none";
  document.getElementById("route-info").style.display = "flex";
  
  const distanceKm = route.distance / 1000;
  document.getElementById("route-dist").textContent = distanceKm.toFixed(1);
  
  // Calcul manuel du temps : à 4 km/h, on met 15 minutes pour faire 1 km.
  const walkTimeMinutes = Math.round(distanceKm * 15);
  document.getElementById("route-time").textContent = walkTimeMinutes;
};

window.clearRoute = () => {
  if (currentRouteLayer) map.removeLayer(currentRouteLayer);
  currentRouteLayer = null;
  document.getElementById("route-btn").style.display = "block";
  document.getElementById("route-info").style.display = "none";
  
  // On recentre sur le joueur
  if (lastGpsPos) map.setView([lastGpsPos.lat, lastGpsPos.lng], 16);
};

// --- 5. CALLBACK PRINCIPAL GPS ---
const updateMapLocation = (lat, lng, accuracy) => {

  // A. LE PODOMÈTRE POUR LE GACHA
  if (lastGpsPos) {
    const distanceKm = turf.distance([lastGpsPos.lng, lastGpsPos.lat], [lng, lat], { units: 'kilometers' });
    // On ignore les micro-tremblements du GPS (moins de 5 mètres)
    if (distanceKm > 0.005) {
      totalDistWalked += distanceKm;
      localStorage.setItem("tabi-dist", totalDistWalked.toString());
      updateGachaDistance(totalDistWalked); // Synchronise l'UI du bouton
    }
  }
  lastGpsPos = { lat, lng };

  // B. Révélation et proximité
  revealLocation(lat, lng);
  checkProximity(lat, lng);

  // C. Mise à jour du marqueur joueur
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

  // D. Récupération des frontières de la ville au premier fix
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

  // E. Téléchargement POI tous les 500m
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
