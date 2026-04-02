# 🚶 Tabi — Explorez l'inconnu

**Tabi** (voyage en japonais) est une Progressive Web App (PWA) ludique d'exploration urbaine. 
Le but est d'encourager la marche et la découverte de sa propre ville à travers des mécaniques de jeu vidéo : dissipation d'un "brouillard de guerre", découverte de monuments historiques et système de collection (Gacha).

## ✨ Fonctionnalités clés

* **Brouillard de guerre géolocalisé :** La carte se dévoile en temps réel au fil des pas de l'utilisateur.
* **Découverte de POI (Points d'Intérêt) :** Détection des monuments, parcs et musées environnants.
* **Appareil photo in-app :** Validation de la découverte d'un lieu par la prise d'une photographie.
* **Planificateur d'itinéraires :** Génération de parcours piétons selon le temps, la distance ou le nombre de pas souhaités.
* **Gacha & Collection :** Déblocage de cartes de villes à collectionner en fonction des kilomètres parcourus ou de l'exploration à 100% d'une ville.

## 🛠️ Stack Technique

L'application est construite volontairement sans framework lourd, afin d'optimiser les performances sur mobile et de maîtriser l'empreinte de l'application.

* **Frontend :** HTML5, CSS3, Vanilla JavaScript (ES Modules).
* **Cartographie :** [Leaflet.js](https://leafletjs.com/)
* **Calculs géospatiaux :** [Turf.js](https://turfjs.org/)
* **API de données :** [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (OpenStreetMap) pour les POIs.
* **API de routage :** [OSRM](http://project-osrm.org/) (Open Source Routing Machine).
* **Stockage :** Cache API (Service Workers) & IndexedDB (pour les photos et la progression).

## 🚀 Installation et développement local

Cette application utilise des **ES Modules** et des fonctionnalités liées aux **PWA** (Service Workers, Géolocalisation). Elle ne peut donc pas être lancée en ouvrant simplement le fichier `index.html` dans le navigateur à cause des sécurités CORS. **Un serveur local est requis.**

### Prérequis
* VS Code avec l'extension **Live Server**
* OU Python installé sur votre machine.

### Lancement
1. Clonez le dépôt : `git clone https://github.com/votre-nom/tabi.git`
2. Lancez un serveur local à la racine du projet :
   * Via Python : `python -m http.server 8000`
   * Via Live Server sur VS Code : Clic droit sur `index.html` > *Open with Live Server*
3. Accédez à l'application via `http://localhost:8000` (ou l'IP locale de votre réseau pour tester sur un smartphone).
