// js/gacha.js
import { CITY_VISUALS, RARITY_COLORS, GACHA_CITIES, RARITY_WEIGHTS, RARITY_LABELS, RARITY_STARS, LAND_POLYS } from './data.js';

const GACHA_KEY = "tabi-gacha-v1";
const MAX_DRAWS = 30;
const KM_PER_DRAW = 0.1; // 100 mètres = 1 tirage (POUR LE TEST !)

let globeRaf = null;
let globeState = { lon0:10, lat0:20, phase:'idle', spinSpeed:0.35, targetLon:null, targetLat:null, drawnCity:null, zoomT:0, zoomScale:1 };
let totalDist = 0; // Distance mise à jour depuis app.js

// --- GESTION DE L'ÉTAT ---
function loadGachaState() {
  try { return JSON.parse(localStorage.getItem(GACHA_KEY)) || {draws:0, lastDaily:null, kmAtLastDraw:0, collection:[]}; }
  catch { return {draws:0, lastDaily:null, kmAtLastDraw:0, collection:[]}; }
}

function saveGachaState(state) {
  try { localStorage.setItem(GACHA_KEY, JSON.stringify(state)); } catch {}
}

export function updateGachaDistance(newTotalDistKm) {
  totalDist = newTotalDistKm;
  const state = loadGachaState();
  const today = new Date().toDateString();
  let changed = false;

  // Tirage quotidien
  if (state.lastDaily !== today) {
    state.draws = Math.min(MAX_DRAWS, state.draws + 1);
    state.lastDaily = today; 
    changed = true;
  }

  // Tirage par la marche
  const kmGained = totalDist - (state.kmAtLastDraw || 0);
  const walkDraws = Math.floor(kmGained / KM_PER_DRAW);
  
  if (walkDraws > 0) {
    state.draws = Math.min(MAX_DRAWS, state.draws + walkDraws);
    state.kmAtLastDraw = (state.kmAtLastDraw || 0) + walkDraws * KM_PER_DRAW;
    changed = true;
  }

  if (changed) saveGachaState(state);
  updateGachaUI(state);
}

function updateGachaUI(state) {
  const dc = document.getElementById("btn-draws-count");
  const cc = document.getElementById("btn-collection-count");
  const dot = document.getElementById("btn-draw-dot");
  if (dc) dc.textContent = state.draws;
  if (cc) cc.textContent = state.collection.length;
  if (dot) dot.style.display = state.draws > 0 ? "inline-block" : "none";
}

// --- LOGIQUE DU TIRAGE ---
function rollRarity() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a,b)=>a+b,0);
  let r = Math.random() * total;
  for (const [rarity, w] of Object.entries(RARITY_WEIGHTS)) {
    r -= w; if (r <= 0) return rarity;
  }
  return "common";
}

function buildCard(city, large = true) {
  const popStr = city.pop >= 1000000 ? (city.pop/1000000).toFixed(1)+"M hab." : Math.round(city.pop/1000)+"k hab.";
  const visual = CITY_VISUALS[city.name] || CITY_VISUALS["Paris"]; // Securité
  const rc = RARITY_COLORS[city.rarity] || RARITY_COLORS.common;
  const c = rc.accent;

  if (!large) {
    return `<div class="gacha-mini ${city.rarity}" title="${city.name}" style="position:relative;overflow:hidden;">
      <svg viewBox="0 0 100 55" style="position:absolute;bottom:0;left:0;width:100%;height:55%;opacity:0.15;"><path d="${visual.sil}" fill="${c}"/></svg>
      <svg viewBox="0 0 100 55" style="width:52px;height:30px;display:block;margin:0 auto;">${visual.svg(c)}</svg>
      <div class="gacha-mini-name">${city.name}</div>
    </div>`;
  }

  return `<div class="gacha-card ${city.rarity}">
    <span class="gacha-card-badge">${RARITY_STARS[city.rarity]} ${RARITY_LABELS[city.rarity]}</span>
    <div style="position:relative;width:100%;height:120px;overflow:hidden;border-radius:10px;margin-bottom:10px;background:${rc.card};display:flex;align-items:flex-end;justify-content:center;">
      <svg viewBox="0 0 100 55" preserveAspectRatio="xMidYMax slice" style="position:absolute;bottom:0;left:0;width:100%;height:100%;opacity:0.2;"><path d="${visual.sil}" fill="${c}"/></svg>
      <svg viewBox="0 0 100 55" style="width:180px;height:98px;position:relative;z-index:1;">${visual.svg(c)}</svg>
    </div>
    <div class="gacha-card-name">${city.name}</div>
    <div class="gacha-card-region">${city.region}</div>
    <div style="border-top:1px solid rgba(0,0,0,0.1);margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;align-items:center;">
      <div class="gacha-card-stat" style="display:block;"><span style="font-size:1rem;">${city.emoji}</span><span style="margin-left:4px;">${popStr}</span></div>
      <div style="font-size:0.5rem;font-family:'Space Mono',monospace;opacity:0.4;letter-spacing:0.12em;">TABI</div>
    </div>
  </div>`;
}

// --- FONCTIONS EXPORTÉES POUR LE HTML ---
window.openDrawScreen = () => {
  const state = loadGachaState();
  document.getElementById("draw-screen").style.display = 'flex';
  document.getElementById("globe-draw-btn").disabled = state.draws <= 0;
  document.getElementById("globe-draw-btn").style.opacity = state.draws > 0 ? '1' : '0.5';
  
  globeState.phase = 'idle'; globeState.zoomScale = 1; globeState.drawnCity = null;
  if(globeRaf) cancelAnimationFrame(globeRaf);
  globeRaf = requestAnimationFrame(globeLoop);
};

window.closeDrawScreen = () => {
  document.getElementById("draw-screen").style.display = 'none';
  if(globeRaf){ cancelAnimationFrame(globeRaf); globeRaf=null; }
};

window.globeDraw = () => {
  const state = loadGachaState();
  if(state.draws <= 0) return;

  const rarity = rollRarity();
  const pool = GACHA_CITIES.filter(c => c.rarity === rarity);
  const city = pool[Math.floor(Math.random() * pool.length)];
  const isNew = !(state.collection).some(c => c.name === city.name);

  state.draws--;
  state.collection.push(city);
  saveGachaState(state);
  updateGachaUI(state);

  document.getElementById("globe-draw-btn").disabled = true;
  document.getElementById("globe-draw-btn").style.opacity = '0.5';

  globeState.drawnCity = city;
  globeState.targetLon = city.lon;
  globeState.targetLat = Math.max(-40, Math.min(40, city.lat*0.7));
  globeState.phase = 'spinning';
  
  globeState.pendingCity = city;
  globeState.pendingIsNew = isNew;
};

window.closeReveal = () => {
  const overlay = document.getElementById("draw-overlay");
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.style.display = 'none';
    window.closeDrawScreen();
  }, 400);
};

window.openCollectionScreen = () => {
  const state = loadGachaState();
  const el = document.getElementById("collection-content");
  
  if(state.collection.length === 0){
    el.style.gridTemplateColumns = '1fr';
    el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#94a3b8;font-size:0.7rem;">Aucune carte encore.<br>Lance un tirage pour commencer !</div>`;
  } else {
    el.style.gridTemplateColumns = 'repeat(3,1fr)';
    // Dédoublonnage
    const counts = {}; const unique = [];
    state.collection.forEach(city => {
      const key = city.name;
      if(!counts[key]){ counts[key] = 0; unique.push(city); }
      counts[key]++;
    });
    
    el.innerHTML = unique.map(city => {
      const badge = counts[city.name] > 1 ? `<div style="position:absolute;top:4px;right:4px;background:#1e293b;color:#fff;border-radius:99px;font-size:0.5rem;padding:1px 5px;">x${counts[city.name]}</div>` : '';
      // On encode l'objet city en base64 pour éviter les bugs de guillemets dans le HTML
      const cityData = btoa(unescape(encodeURIComponent(JSON.stringify(city))));
      return `<div style="position:relative;" onclick="showCardDetail('${cityData}')">${buildCard(city, false)}${badge}</div>`;
    }).join('');
  }
  document.getElementById("collection-screen").style.display = 'flex';
};

window.closeCollectionScreen = () => {
  document.getElementById("collection-screen").style.display = 'none';
};

window.showCardDetail = (cityBase64) => {
  const city = JSON.parse(decodeURIComponent(escape(atob(cityBase64))));
  const overlay = document.getElementById("gacha-overlay");
  overlay.style.display = 'flex';
  document.getElementById("gacha-overlay-card").innerHTML = buildCard(city, true);
  overlay.onclick = (e) => { if(e.target===overlay) overlay.style.display = 'none'; };
};

// --- LOGIQUE DU GLOBE 3D (CANVAS) ---
function globeProject(lat, lon, lon0, lat0, R) {
  const dLon = (lon - lon0) * Math.PI/180;
  const latR = lat * Math.PI/180, lat0R = lat0 * Math.PI/180;
  const x = R * Math.cos(latR) * Math.sin(dLon);
  const y = R * (Math.sin(latR)*Math.cos(lat0R) - Math.cos(latR)*Math.cos(dLon)*Math.sin(lat0R));
  const z = Math.sin(latR)*Math.sin(lat0R) + Math.cos(latR)*Math.cos(dLon)*Math.cos(lat0R);
  return { x, y, z };
}

function drawGlobeFrame() {
  const canvas = document.getElementById("globe-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, CX = W/2, CY = W/2;
  const R = (W/2 - 4) * globeState.zoomScale;

  ctx.clearRect(0,0,W,W);
  ctx.save();
  
  if (globeState.phase === 'zooming' && globeState.drawnCity) {
    const tp = globeProject(globeState.drawnCity.lat, globeState.drawnCity.lon, globeState.lon0, globeState.lat0, (W/2 - 4));
    if (tp && tp.z > 0) {
      const t = Math.min(1, (globeState.zoomScale - 1) / 5);
      ctx.translate(-tp.x * t * globeState.zoomScale * 0.92, tp.y * t * globeState.zoomScale * 0.92);
    }
  }

  // Océan
  ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip();
  ctx.fillStyle = '#080f2e'; ctx.fillRect(0,0,W,W);

  // Terres
  ctx.fillStyle='#1e5c33';
  for(const poly of LAND_POLYS){
    ctx.beginPath();
    let first = true;
    for(const [la,lo] of poly){
      const p = globeProject(la,lo,globeState.lon0,globeState.lat0,R);
      if(p.z > 0.02) {
        if(first) { ctx.moveTo(CX+p.x,CY-p.y); first = false; }
        else ctx.lineTo(CX+p.x,CY-p.y);
      } else { first = true; }
    }
    ctx.fill();
  }

  ctx.restore();
}

function globeLoop() {
  const gs = globeState;
  if(gs.phase==='idle'){
    gs.lon0=(gs.lon0+gs.spinSpeed)%360;
    drawGlobeFrame();
  } else if(gs.phase==='spinning'){
    const diff=((gs.targetLon-gs.lon0+540)%360)-180;
    const latDiff=(gs.targetLat-gs.lat0)*0.04;
    gs.lat0+=latDiff;
    if(Math.abs(diff)<0.6&&Math.abs(latDiff)<0.05){
      gs.lon0=gs.targetLon; gs.lat0=gs.targetLat; gs.phase='zooming'; gs.zoomT=0;
    } else {
      const spd=Math.max(0.4,Math.abs(diff)*0.07);
      gs.lon0=(gs.lon0+Math.sign(diff)*Math.min(spd,Math.abs(diff)))%360;
    }
    drawGlobeFrame();
  } else if(gs.phase==='zooming'){
    gs.zoomT = Math.min(1, gs.zoomT + 0.02);
    gs.zoomScale = 1 + (gs.zoomT * gs.zoomT) * 39; 
    drawGlobeFrame();
    if(gs.zoomT >= 1){ 
      gs.phase='done'; 
      showGachaReveal(); 
    }
  }
  globeRaf = requestAnimationFrame(globeLoop);
}

function showGachaReveal() {
  const city = globeState.pendingCity;
  const overlay = document.getElementById("draw-overlay");
  document.getElementById("reveal-card-wrap").innerHTML = buildCard(city, true);
  document.getElementById("reveal-label").textContent = globeState.pendingIsNew ? '✨ Nouvelle ville découverte !' : 'Doublon · déjà possédé';
  
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.style.opacity = '1';
    document.getElementById("reveal-card-wrap").style.transform = 'rotateY(0deg) scale(1)';
    document.getElementById("reveal-card-wrap").style.opacity = '1';
    document.getElementById("reveal-close-btn").style.opacity = '1';
  }, 50);
}

// Initialisation au chargement
updateGachaDistance(0);
