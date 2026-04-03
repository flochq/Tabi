// js/routing.js

export async function fetchWalkingRoute(coordinates) {
  // Il faut au moins un point de départ et une destination
  if (coordinates.length < 2) return null;
  
  // Formatage requis par l'API OSRM : lon,lat;lon,lat;...
  const coordsString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
  
  // Paramètres : itinéraire à pied (foot), on veut le tracé complet (full), au format GeoJSON
  const url = `https://router.project-osrm.org/route/v1/foot/${coordsString}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }
    
    // On renvoie le meilleur itinéraire calculé
    return data.routes[0];
  } catch (error) {
    console.error("Tabi : Erreur de routage", error);
    return null;
  }
}
