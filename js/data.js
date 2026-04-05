// js/data.js

export const CITY_VISUALS = {
  "Paris": {
    // ➔ NOUVEAU : Une forme de silhouette de la ville (remplace le triangle générique).
    // silhouette de fond
    sil: "M49 10 L55 12 L58 18 L58 24 L56 30 L52 35 L48 35 L44 30 L42 24 L42 18 L45 12 L49 10 Z",
    // Icône principale (la même forme pour la cohérence)
    svg: (c) => `<path d="M49 10 L55 12 L58 18 L58 24 L56 30 L52 35 L48 35 L44 30 L42 24 L42 18 L45 12 L49 10 Z" fill="${c}"/>`
  },
  "Kyoto": { 
    // ➔ NOUVEAU : Forme simplifiée pour Kyoto.
    sil: "M20 10 L80 10 L80 55 L20 55 Z",
    svg: (c) => `<path d="M20 10 L80 10 L80 55 L20 55 Z" fill="${c}"/>`
  }
};

export const RARITY_COLORS = {
  common: { card: "#f8fafc", accent: "#64748b" },
  rare: { card: "#eff6ff", accent: "#3b82f6" },
  epic: { card: "#fefce8", accent: "#eab308" },
  legendary: { card: "#fdf4ff", accent: "#d946ef" }
};

export const RARITY_WEIGHTS = { common: 60, rare: 30, epic: 9, legendary: 1 };
export const RARITY_LABELS = { common: "Commune", rare: "Rare", epic: "Épique", legendary: "Légendaire" };
export const RARITY_STARS = { common: "⭐", rare: "⭐⭐", epic: "⭐⭐⭐", legendary: "🌟" };

// ➔ NOUVEAU : Remplacement de "pop" par "type" et "uid" (Identifiant Unique)
export const GACHA_CITIES = [
  { name: "Paris", region: "Île-de-France", type: "Métropole", rarity: "common", emoji: "🥐", lat: 48.8566, lon: 2.3522, uid: "FR-PAR-01" },
  { name: "Kyoto", region: "Kansai", type: "Historique", rarity: "epic", emoji: "⛩️", lat: 35.0116, lon: 135.7681, uid: "JP-KYO-01" }
];

export const LAND_POLYS = [];
