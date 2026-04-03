// js/app.js
import { initGPS } from './gps.js';
import { initFog, revealLocation } from './fog.js';


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

let userMarker = null;

const updateMapLocation = (lat, lng, accuracy) => {
  // On fait le trou dans le brouillard
  revealLocation(lat, lng);

  // On place ou on déplace le joueur
  if (!userMarker) {
    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="user-dot"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(map);
    map.setView([lat, lng], 14);
  } else {
    userMarker.setLatLng([lat, lng]);
  }
};

initGPS(updateMapLocation, (msg) => console.warn(msg));
