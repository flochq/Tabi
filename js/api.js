// js/api.js

// Détermine quel émoji afficher selon le type de lieu
function getPoiIcon(tags) {
  if (tags.tourism === "museum") return "🏛️";
  if (tags.historic === "castle") return "🏰";
  if (tags.historic === "ruins") return "🏚️";
  if (tags.amenity === "place_of_worship") return "⛪";
  if (tags.leisure === "park" || tags.leisure === "garden") return "🌳";
  if (tags.amenity === "fountain") return "⛲";
  if (tags.tourism === "artwork") return "🎨";
  return "🗿"; // Monument générique
}

// Détermine une petite description
function getPoiDesc(tags) {
  if (tags.tourism === "museum") return "Musée — entrez pour découvrir ses collections.";
  if (tags.leisure === "park") return "Un espace vert pour se ressourcer.";
  if (tags.historic === "castle") return "Un château chargé d'histoire.";
  return "Point d'intérêt à découvrir.";
}

// Fonction principale pour interroger OpenStreetMap
export async function fetchPOIs(lat, lng, radiusMeters = 1000) {
  // Requête optimisée (nwr = node, way, relation) avec "out center" pour cibler le centre des bâtiments
  const query = `
    [out:json][timeout:10];
    (
      nwr["tourism"~"museum|artwork|viewpoint"](around:${radiusMeters},${lat},${lng});
      nwr["historic"~"monument|castle|ruins"](around:${radiusMeters},${lat},${lng});
      nwr["amenity"~"place_of_worship|fountain"](around:${radiusMeters},${lat},${lng});
      nwr["leisure"~"park|garden"]["wikidata"](around:${radiusMeters},${lat},${lng});
    );
    out center 30; 
  `; // On limite à 30 résultats maximum pour ne pas surcharger la carte mobile

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query
    });

    if (!response.ok) throw new Error("Erreur réseau API");
    const data = await response.json();

    // On nettoie et on formate les données pour notre application
    return data.elements
      .filter(el => el.tags && (el.tags.name || el.tags["name:fr"]))
      .map(el => ({
        id: `osm-${el.type}-${el.id}`,
        name: el.tags["name:fr"] || el.tags.name,
        desc: getPoiDesc(el.tags),
        icon: getPoiIcon(el.tags),
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
      }))
      .filter(p => p.lat && p.lng);

  } catch (error) {
    console.error("Tabi : Impossible de récupérer les monuments", error);
    return []; // En cas d'erreur (pas de réseau), on renvoie un tableau vide pour ne pas crasher l'app
  }
}
