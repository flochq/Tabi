// js/data.js

export const CITY_VISUALS = {
  "Paris": { 
    sil: "M0 55 L100 55 L50 10 Z", 
    svg: (c) => `<path d="M50 10 L60 55 L40 55 Z" fill="${c}"/>` 
  },
  "Kyoto": { 
    sil: "M0 55 L100 55 L50 10 Z", 
    svg: (c) => `<path d="M50 10 L60 55 L40 55 Z" fill="${c}"/>` 
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

export const GACHA_CITIES = [
  { name: "Paris", region: "Île-de-France", rarity: "common", emoji: "🥐", lat: 48.8566, lon: 2.3522, uid: "FR-PAR-01", type: "Métropole" },
  { name: "Kyoto", region: "Kansai", rarity: "epic", emoji: "⛩️", lat: 35.0116, lon: 135.7681, uid: "JP-KYO-01", type: "Historique" }
];

// Tableau vide temporaire pour ne pas faire crasher l'animation 3D du globe
export const LAND_POLYS = [];
