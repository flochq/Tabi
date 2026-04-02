// js/fog.js

// 1. Paramètres de base
const FOG_COLOR = "#0f172a";   // Un bleu nuit très sombre
const FOG_OPACITY = 0.85;      // Opacité du brouillard (0 = invisible, 1 = opaque)
const REVEAL_RADIUS_KM = 0.05; // Rayon de découverte : 50 mètres
const CIRCLE_STEPS = 32;       // Qualité du cercle de découpe (plus c'est haut, plus c'est rond, mais plus c'est lourd)
const STORAGE_KEY = "tabi-fog-v1";

// 2. Le monde entier (un polygone géant)
// Attention : Turf.js utilise le format [Longitude, Latitude] !
const WORLD = turf.polygon([[
  [-180, -90],
  [180, -90],
  [180, 90],
  [-180, 90],
  [-180, -90]
]]);

let exploredArea = null; // Stockera le polygone de tout ce qui a été révélé
let fogLayer = null;     // La couche visuelle sur Leaflet

// 3. Initialiser le brouillard sur la carte
export function initFog(map) {
  // Tente de charger les zones déjà explorées depuis le cache
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) exploredArea = JSON.parse(saved);
  } catch (e) {
    console.warn("Erreur lors de la lecture du brouillard sauvegardé.", e);
  }

  // Calcule le brouillard initial (Le monde entier MOINS la zone explorée)
  let initialFog = WORLD;
  if (exploredArea) {
    try {
      initialFog = turf.difference(WORLD, exploredArea);
    } catch (e) {
      console.warn("Erreur topologique au démarrage, reset du brouillard.");
      exploredArea = null;
    }
  }

  // Crée la couche visuelle sur Leaflet
  fogLayer = L.geoJSON(initialFog, {
    style: {
      fillColor: FOG_COLOR,
      fillOpacity: FOG_OPACITY,
      color: "none",        // Pas de bordure
      weight: 0,
      interactive: false    // Permet de cliquer "à travers" le brouillard
    }
  }).addTo(map);
}

// 4. Dissiper le brouillard autour d'une position
export function revealLocation(lat, lng) {
  if (!fogLayer) return;

  // Créer un nouveau cercle autour du joueur (lng, lat pour Turf !)
  const newCircle = turf.circle([lng, lat], REVEAL_RADIUS_KM, {
    steps: CIRCLE_STEPS,
    units: 'kilometers'
  });

  // Fusionner ce nouveau cercle avec l'existant
  if (!exploredArea) {
    exploredArea = newCircle;
  } else {
    try {
      exploredArea = turf.union(exploredArea, newCircle);
    } catch (e) {
      console.warn("Erreur de fusion des polygones", e);
      return; // On annule cette itération si Turf échoue
    }
  }

  // Découper la zone explorée du monde
  try {
    const currentFog = turf.difference(WORLD, exploredArea);
    
    // Mettre à jour l'affichage
    fogLayer.clearLayers();
    fogLayer.addData(currentFog || WORLD);

    // Sauvegarder la progression
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exploredArea));
  } catch (e) {
    console.error("Erreur lors de la découpe du brouillard", e);
  }
}
