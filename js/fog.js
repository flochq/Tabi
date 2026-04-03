// js/fog.js

const FOG_COLOR = "#0f172a";
const FOG_OPACITY = 0.85;
const REVEAL_RADIUS_KM = 0.5; // On passe à 500 mètres pour le test !
const CIRCLE_STEPS = 32;
const STORAGE_KEY = "tabi-fog-v2"; // Nouvelle clé pour ignorer les anciennes erreurs

// On limite le brouillard à la France/Europe de l'Ouest pour éviter les bugs des pôles
const WORLD = turf.bboxPolygon([-6, 41, 10, 52]);

let exploredArea = null;
let fogLayer = null;

export function initFog(map) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) exploredArea = JSON.parse(saved);
  } catch (e) {
    console.warn("Cache brouillard vide ou corrompu.");
  }

  let initialFog = WORLD;
  if (exploredArea) {
    try {
      initialFog = turf.difference(WORLD, exploredArea);
    } catch (e) {
      exploredArea = null;
    }
  }

  fogLayer = L.geoJSON(initialFog, {
    style: {
      fillColor: FOG_COLOR,
      fillOpacity: FOG_OPACITY,
      color: "none",
      weight: 0,
      interactive: false
    }
  }).addTo(map);
}

export function revealLocation(lat, lng) {
  if (!fogLayer) return;

  const newCircle = turf.circle([lng, lat], REVEAL_RADIUS_KM, {
    steps: CIRCLE_STEPS,
    units: 'kilometers'
  });

  if (!exploredArea) {
    exploredArea = newCircle;
  } else {
    try {
      exploredArea = turf.union(exploredArea, newCircle);
    } catch (e) {
      console.warn("Erreur Turf union", e);
      return;
    }
  }

  try {
    const currentFog = turf.difference(WORLD, exploredArea);
    
    fogLayer.clearLayers();
    fogLayer.addData(currentFog || WORLD);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(exploredArea));
  } catch (e) {
    console.error("Erreur Turf difference", e);
  }
}
