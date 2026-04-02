// js/gps.js

export function initGPS(onLocationUpdate, onError) {
  if (!("geolocation" in navigator)) {
    onError("La géolocalisation n'est pas supportée par votre appareil.");
    return null;
  }

  const options = {
    enableHighAccuracy: true, // Force l'utilisation de la puce GPS (indispensable pour marcher)
    maximumAge: 2000,         // Accepte une position en cache datant de 2 secondes maximum
    timeout: 10000            // Temps d'attente maximal (10 secondes)
  };

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy; // Rayon de précision en mètres
      
      // On transmet les données au reste de l'application
      onLocationUpdate(lat, lng, accuracy);
    },
    (error) => {
      let errorMsg = "Erreur GPS inconnue.";
      if (error.code === 1) errorMsg = "Vous avez refusé l'accès à la position.";
      if (error.code === 2) errorMsg = "Position indisponible (signal GPS faible ou désactivé).";
      if (error.code === 3) errorMsg = "Le délai d'attente a expiré.";
      
      onError(errorMsg);
    },
    options
  );

  return watchId;
}
