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

// Récupère les frontières de la ville actuelle
export async function fetchCityBoundary(lat, lng) {
  // Requête Overpass : "Donne-moi la frontière administrative de niveau 8 (ville) qui contient ces coordonnées"
  const query = `
    [out:json][timeout:15];
    is_in(${lat},${lng})->.a;
    area.a["admin_level"="8"]["boundary"="administrative"]->.b;
    rel(pivot.b);
    out geom;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query
    });

    if (!response.ok) throw new Error("Erreur réseau API Frontières");
    const data = await response.json();
    
    if (!data.elements || !data.elements.length) return null;
    const rel = data.elements[0];

    // On récupère le nom de la ville
    const cityName = rel.tags?.["name:fr"] || rel.tags?.name || "Votre ville";

    // On reconstruit le polygone à partir des segments de la frontière
    const outerWays = rel.members.filter(m => m.type === "way" && m.role === "outer" && m.geometry);
    if (!outerWays.length) return null;

    let segments = outerWays.map(w => w.geometry.map(p => [p.lon, p.lat]));
    let rings = [];
    
    // Algorithme pour relier les bouts de ligne dans le bon ordre (OpenStreetMap renvoie les lignes en désordre)
    while (segments.length > 0) {
      let ring = [...segments[0]];
      segments.splice(0, 1);
      let maxIter = segments.length * 3;
      while (segments.length > 0 && maxIter-- > 0) {
        const tail = ring[ring.length - 1];
        let bestIdx = -1, bestDist = 1e9, bestReverse = false;
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const d1 = Math.sqrt((tail[0]-seg[0][0])**2 + (tail[1]-seg[0][1])**2);
          const d2 = Math.sqrt((tail[0]-seg[seg.length-1][0])**2 + (tail[1]-seg[seg.length-1][1])**2);
          if (d1 < bestDist) { bestDist = d1; bestIdx = i; bestReverse = false; }
          if (d2 < bestDist) { bestDist = d2; bestIdx = i; bestReverse = true; }
        }
        if (bestIdx === -1 || bestDist > 0.001) break;
        const seg = segments[bestIdx];
        segments.splice(bestIdx, 1);
        ring = ring.concat(bestReverse ? [...seg].reverse().slice(1) : seg.slice(1));
      }
      if (Math.abs(ring[0][0]-ring[ring.length-1][0]) > 1e-6 || Math.abs(ring[0][1]-ring[ring.length-1][1]) > 1e-6) {
        ring.push(ring[0]); // Fermer la boucle
      }
      rings.push(ring);
    }

    rings.sort((a, b) => b.length - a.length); // On prend la plus grande boucle (contour extérieur)
    if (rings[0].length < 4) return null;

    // On transforme ça en objet Turf.js
    const polygon = turf.polygon([rings[0]]);
    const area = turf.area(polygon) / 1e6; // Surface en km²

    return { name: cityName, polygon, area };
  } catch (error) {
    console.warn("Tabi : Impossible de récupérer les frontières de la ville", error);
    return null;
  }
}
