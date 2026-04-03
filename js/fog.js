// js/fog.js
import { saveFog, loadFog } from './storage.js';

const FOG_COLOR = "#0f172a";
const FOG_OPACITY = 0.95;
const REVEAL_RADIUS_KM = 0.05; // De retour à 50 mètres réels
const CIRCLE_STEPS = 32;

// Limite de sécurité pour éviter les calculs aux pôles
const WORLD = turf.bboxPolygon([-6, 41, 10, 52]);

let exploredArea = null;
let fogLayer = null;

// On rend l'initialisation asynchrone pour attendre la base de données
export async function initFog(map) {
  // 1. On charge la sauvegarde depuis IndexedDB
  exploredArea = await loadFog();

  // 2. On calcule le brouillard initial
  let initialFog = WORLD;
  if (exploredArea) {
    try {
      initialFog = turf.difference(WORLD, exploredArea);
    } catch (e) {
      console.warn("Erreur topologique, réinitialisation du brouillard.");
      exploredArea = null;
    }
  }

// 3. On dessine sur la carte
  fogLayer = L.geoJSON(initialFog, {
    style: {
      className: 'fog-layer', // ➔ NOUVEAU : On applique notre effet de flou CSS
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

    // ➔ NOUVEAU : Sauvegarde robuste et silencieuse en arrière-plan
    saveFog(exploredArea);
  } catch (e) {
    console.error("Erreur Turf difference", e);
  }
}

export function revealMassiveLocation(lat, lng) {
  if (!fogLayer) return;

  // On crée un énorme cercle de 350 mètres !
  const massiveCircle = turf.circle([lng, lat], 0.35, {
    steps: 32,
    units: 'kilometers'
  });

  if (!exploredArea) {
    exploredArea = massiveCircle;
  } else {
    try {
      exploredArea = turf.union(exploredArea, massiveCircle);
    } catch (e) {
      console.warn("Erreur Turf union massive", e);
      return;
    }
  }

  try {
    const currentFog = turf.difference(WORLD, exploredArea);
    fogLayer.clearLayers();
    fogLayer.addData(currentFog || WORLD);
    saveFog(exploredArea); // Sauvegarde robuste via IndexedDB
  } catch (e) {
    console.error("Erreur Turf difference massive", e);
  }
}
