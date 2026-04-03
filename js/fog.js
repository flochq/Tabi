// js/fog.js

// On limite le monde à l'Europe de l'Ouest pour éviter les bugs géométriques aux Pôles
const WORLD = turf.bboxPolygon([-6, 41, 10, 52]);
let fogLayer = null;

export function initFog(map) {
  // On dessine le monde entier en bleu nuit
  fogLayer = L.geoJSON(WORLD, {
    style: { fillColor: "#0f172a", fillOpacity: 0.95, stroke: false, interactive: false }
  }).addTo(map);
}

export function revealLocation(lat, lng) {
  if (!fogLayer) return;

  try {
    // 1. On crée un cercle de 500m autour du joueur
    const circle = turf.circle([lng, lat], 0.05, { steps: 32, units: 'kilometers' });
    
    // 2. On découpe ce cercle du grand polygone WORLD
    const currentFog = turf.difference(WORLD, circle);
    
    // 3. On met à jour l'affichage
    fogLayer.clearLayers();
    fogLayer.addData(currentFog || WORLD);
  } catch (e) {
    alert("Erreur de découpe du brouillard : " + e.message);
  }
}
