// js/gacha.js
import { CITY_VISUALS, RARITY_COLORS, RARITY_WEIGHTS, RARITY_LABELS, RARITY_STARS, GACHA_CITIES, LAND_POLYS } from './data.js';

// --- PODOMÈTRE GACHA ---
export function updateGachaDistance(totalDist) {
  const gachaKey = "tabi-gacha-v1";
  let state = JSON.parse(localStorage.getItem(gachaKey)) || { draws: 0, lastDist: 0, collection: [] };
  
  const diff = totalDist - state.lastDist;
  if (diff >= 1) { 
    const earned = Math.floor(diff);
    state.draws += earned;
    state.lastDist += earned;
    localStorage.setItem(gachaKey, JSON.stringify(state));
    
    const drawCountEl = document.getElementById("btn-draws-count");
    if (drawCountEl) drawCountEl.textContent = state.draws;
    const dot = document.getElementById("btn-draw-dot");
    if (dot) dot.style.display = "inline-block";
  }
}

// --- CONVERTISSEUR GEOJSON -> SVG ---
export function geoJsonToSvgPath(geoJson) {
  if (!geoJson || !geoJson.coordinates) return null;
  
  let polys = [];
  if (geoJson.type === 'Polygon') polys = [geoJson.coordinates];
  else if (geoJson.type === 'MultiPolygon') polys = geoJson.coordinates;
  else return null;
  
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  polys.forEach(poly => {
    poly[0].forEach(coord => {
      if (coord[0] < minX) minX = coord[0];
      if (coord[0] > maxX) maxX = coord[0];
      if (coord[1] < minY) minY = coord[1];
      if (coord[1] > maxY) maxY = coord[1];
    });
  });

  const lonDiff = maxX - minX || 1;
  const latDiff = maxY - minY || 1;
  const scale = Math.min(90 / lonDiff, 45 / latDiff);
  
  const xOffset = (100 - (lonDiff * scale)) / 2;
  const yOffset = (55 - (latDiff * scale)) / 2;

  let pathStr = "";
  polys.forEach(poly => {
    poly[0].forEach((coord, i) => {
      const x = (coord[0] - minX) * scale + xOffset;
      const y = 55 - ((coord[1] - minY) * scale + yOffset); 
      pathStr += (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)} ` : `L ${x.toFixed(1)} ${y.toFixed(1)} `);
    });
    pathStr += "Z ";
  });
  
  return pathStr;
}

// --- GÉNÉRATEUR DE CARTES (DESIGN DATAPAD) ---
export function buildCard(city, large = true, count = 1) {
  try {
    let dynamicPath = city.svgPath;
    if (!dynamicPath && city.polygon) {
      dynamicPath = geoJsonToSvgPath(city.polygon);
    }
    
    const visual = dynamicPath 
      ? { sil: dynamicPath, svg: (c) => `<path d="${dynamicPath}" fill="${c}"/>` }
      : (CITY_VISUALS[city.name] || { sil: "M20 20 L80 20 L80 40 L20 40 Z", svg: (c) => `<path d="M20 20 L80 20 L80 40 L20 40 Z" fill="${c}"/>` });

    const rc = RARITY_COLORS[city.rarity] || RARITY_COLORS.common;
    const c = rc.accent; 

    if (!large) {
      const countHtml = count > 1 ? `<div class="gacha-mini-count">x${count}</div>` : '';
      const safeName = city.name ? city.name.replace(/'/g, "\\'") : '';
      
      return `<div class="gacha-mini ${city.rarity || 'common'}" title="${city.name || 'Inconnu'}" onclick="viewCollectionCard('${safeName}')">
        ${countHtml}
        <svg viewBox="0 0 100 55" style="position:absolute;bottom:0;left:0;width:100%;height:55%;opacity:0.1;"><path d="${visual.sil}" fill="${c}"/></svg>
        <div class="gacha-mini-emoji">${city.emoji || '❓'}</div>
        <div class="gacha-mini-name">${city.name || 'Inconnu'}</div>
      </div>`;
    }

    const latStr = city.lat !== undefined ? (city.lat >= 0 ? `N${city.lat.toFixed(2)}` : `S${Math.abs(city.lat).toFixed(2)}`) : "N--.--";
    const lonStr = city.lon !== undefined ? (city.lon >= 0 ? `E${city.lon.toFixed(2)}` : `W${Math.abs(city.lon).toFixed(2)}`) : "E--.--";

    return `<div class="gacha-card ${city.rarity || 'common'}">
      <div class="gacha-card-rarity">
        <span>${RARITY_LABELS[city.rarity] || 'CLASSIQUE'}</span>
        <span>${RARITY_STARS[city.rarity] || '⭐'}</span>
      </div>
      
      <div style="position:relative;width:100%;height:130px;overflow:hidden;border-radius:12px;margin-bottom:12px;background:rgba(0,0,0,0.3);display:flex;align-items:flex-end;justify-content:center;box-shadow:inset 0 4px 20px rgba(0,0,0,0.5);">
        <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);z-index:2;pointer-events:none;"></div>
        <svg viewBox="0 0 100 55" preserveAspectRatio="xMidYMax slice" style="position:absolute;bottom:0;left:0;width:100%;height:100%;opacity:0.15;"><path d="${visual.sil}" fill="${c}"/></svg>
        <svg viewBox="0 0 100 55" style="width:190px;height:104px;position:relative;z-index:1;filter:drop-shadow(0 0 8px ${c});">${visual.svg(c)}</svg>
      </div>
      
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
        <div class="gacha-card-name">${city.name || 'Inconnu'}</div>
        <div style="font-size:1.2rem;line-height:1;">${city.emoji || '❓'}</div>
      </div>
      
      <div class="gacha-card-region">${city.region || 'SECTEUR'} • ${city.type || 'ZONE INCONNUE'}</div>
      
      <div class="gacha-card-stat" style="flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#fff;">COORD</span>
          <span style="color:${c};">${latStr} // ${lonStr}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.5rem;opacity:0.5;">UID: ${city.uid || 'XXX-000'}</span>
          <span style="font-family:monospace;font-size:0.8rem;letter-spacing:-1px;opacity:0.6;">||| | ||| || |</span>
        </div>
      </div>
    </div>`;
  } catch(e) {
    console.error("Erreur buildCard:", e);
    return `<div class="gacha-mini common">Erreur</div>`;
  }
}

// --- RÉCOMPENSE DES 100% DE LA VILLE ---
export function awardCityCompletion(cityName, polygon, lat, lng) {
  const dynamicPath = geoJsonToSvgPath(polygon);
  
  const specialCard = {
      name: cityName,
      region: "Exploration Totale",
      type: "Ville Maîtrisée",
      rarity: "legendary", 
      emoji: "🏆",
      lat: lat,
      lon: lng,
      uid: `EXP-${cityName.substring(0,3).toUpperCase()}-100`,
      svgPath: dynamicPath
  };

  const gachaKey = "tabi-gacha-v1";
  let state = JSON.parse(localStorage.getItem(gachaKey)) || { draws: 0, collection: [] };
  if (!state.collection) state.collection = [];
  state.collection.push(specialCard);
  localStorage.setItem(gachaKey, JSON.stringify(state));

  const btnCollectionCount = document.getElementById("btn-collection-count");
  if (btnCollectionCount) btnCollectionCount.textContent = state.collection.length;

  const overlay = document.getElementById("draw-overlay");
  const wrap = document.getElementById("reveal-card-wrap");
  const label = document.getElementById("reveal-label");
  const btn = document.getElementById("reveal-close-btn");

  if(overlay && wrap && label && btn) {
      wrap.innerHTML = buildCard(specialCard, true);
      label.innerHTML = `INCROYABLE !<br>Vous avez cartographié ${cityName} !`;

      overlay.style.zIndex = "2000";
      overlay.style.display = "flex";
      setTimeout(() => {
        overlay.style.backgroundColor = "rgba(0,0,0,0.85)";
        wrap.style.transform = "rotateY(0deg) scale(1)";
        wrap.style.opacity = "1";
      }, 50);

      setTimeout(() => {
        label.style.color = "rgba(255,255,255,0.8)";
        btn.style.opacity = "1";
      }, 800);
  }
}

// --- LOGIQUE DU GLOBE 3D ---
let globeState = { lon0: 0, lat0: 20, zoomScale: 1, phase: 'idle' };

function globeProject(lat, lon, lon0, lat0, R) {
  const d2r = Math.PI/180;
  const rLa = lat*d2r, rLo = lon*d2r, rLa0 = lat0*d2r, rLo0 = lon0*d2r;
  const x = Math.cos(rLa)*Math.sin(rLo-rLo0);
  const y = Math.cos(rLa0)*Math.sin(rLa) - Math.sin(rLa0)*Math.cos(rLa)*Math.cos(rLo-rLo0);
  const z = Math.sin(rLa0)*Math.sin(rLa) + Math.cos(rLa0)*Math.cos(rLa)*Math.cos(rLo-rLo0);
  return { x: x*R, y: y*R, z: z };
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

  ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip();
  ctx.fillStyle = '#020617'; ctx.fillRect(0,0,W,W);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.lineWidth = 1.2;
  
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
    ctx.stroke();
  }

  const grad = ctx.createRadialGradient(CX, CY, R*0.5, CX, CY, R);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,W);

  ctx.restore();
}

let globeAnimId = null;
function animateGlobe() {
  if (globeState.phase === 'idle') globeState.lon0 += 0.5;
  drawGlobeFrame();
  globeAnimId = requestAnimationFrame(animateGlobe);
}

// --- INTERFACE GLOBALE DU GACHA ---
window.openDrawScreen = () => {
  document.getElementById("draw-screen").style.display = "flex";
  document.getElementById("btn-draw-dot").style.display = "none";
  const gachaKey = "tabi-gacha-v1";
  const state = JSON.parse(localStorage.getItem(gachaKey)) || { draws: 0, collection: [] };
  
  const drawBtn = document.getElementById("globe-draw-btn");
  drawBtn.textContent = `Tirer une carte (${state.draws} dispo)`;
  drawBtn.disabled = state.draws <= 0;
  drawBtn.style.opacity = state.draws <= 0 ? "0.5" : "1";

  if (!globeAnimId) animateGlobe();
};

window.closeDrawScreen = () => {
  document.getElementById("draw-screen").style.display = "none";
  if (globeAnimId) { cancelAnimationFrame(globeAnimId); globeAnimId = null; }
};

window.globeDraw = () => {
  const gachaKey = "tabi-gacha-v1";
  let state = JSON.parse(localStorage.getItem(gachaKey));
  if (!state || state.draws <= 0) return;

  state.draws -= 1;
  localStorage.setItem(gachaKey, JSON.stringify(state));

  const r = Math.random() * 100;
  let rarity = 'common';
  if (r > RARITY_WEIGHTS.common) rarity = 'rare';
  if (r > RARITY_WEIGHTS.common + RARITY_WEIGHTS.rare) rarity = 'epic';
  if (r > RARITY_WEIGHTS.common + RARITY_WEIGHTS.rare + RARITY_WEIGHTS.epic) rarity = 'legendary';

  const pool = GACHA_CITIES.filter(c => c.rarity === rarity);
  const drawn = pool[Math.floor(Math.random() * pool.length)];

  if (!state.collection) state.collection = [];
  state.collection.push(drawn);
  localStorage.setItem(gachaKey, JSON.stringify(state));

  const drawBtn = document.getElementById("globe-draw-btn");
  drawBtn.textContent = `Tirer une carte (${state.draws} dispo)`;
  drawBtn.disabled = true;

  globeState.phase = 'zooming';
  globeState.drawnCity = drawn;
  
  const targetLon = drawn.lon;
  const targetLat = drawn.lat;
  let frame = 0;
  
  const zoomAnim = setInterval(() => {
    frame++;
    const p = frame / 60;
    
    let lonDiff = targetLon - (globeState.lon0 % 360);
    if (lonDiff > 180) lonDiff -= 360;
    if (lonDiff < -180) lonDiff += 360;
    
    globeState.lon0 += lonDiff * 0.05;
    globeState.lat0 += (targetLat - globeState.lat0) * 0.05;
    globeState.zoomScale = 1 + (p * 5);

    if (frame >= 60) {
      clearInterval(zoomAnim);
      showReveal(drawn);
    }
  }, 16);
};

function showReveal(city) {
  const overlay = document.getElementById("draw-overlay");
  const wrap = document.getElementById("reveal-card-wrap");
  const label = document.getElementById("reveal-label");
  const btn = document.getElementById("reveal-close-btn");

  wrap.innerHTML = buildCard(city, true);
  label.innerHTML = "DONNÉES EXTRAITES<br>NOUVELLE CARTE AJOUTÉE";
  
  overlay.style.zIndex = "2000";
  overlay.style.display = "flex";
  
  setTimeout(() => {
    overlay.style.backgroundColor = "rgba(0,0,0,0.85)";
    wrap.style.transform = "rotateY(0deg) scale(1)";
    wrap.style.opacity = "1";
  }, 50);

  setTimeout(() => {
    label.style.color = "rgba(255,255,255,0.8)";
    btn.style.opacity = "1";
  }, 800);
}

window.closeReveal = () => {
  document.getElementById("draw-overlay").style.display = "none";
  document.getElementById("reveal-card-wrap").style.opacity = "0";
  document.getElementById("reveal-card-wrap").style.transform = "rotateY(90deg) scale(0.8)";
  document.getElementById("reveal-label").style.color = "rgba(255,255,255,0)";
  document.getElementById("reveal-close-btn").style.opacity = "0";
  
  globeState.phase = 'idle';
  globeState.zoomScale = 1;
  
  const gachaKey = "tabi-gacha-v1";
  const state = JSON.parse(localStorage.getItem(gachaKey));
  const drawBtn = document.getElementById("globe-draw-btn");
  if(drawBtn && state) drawBtn.disabled = state.draws <= 0;
  
  const btnDrawsCount = document.getElementById("btn-draws-count");
  if (btnDrawsCount && state) btnDrawsCount.textContent = state.draws;
  
  const btnColCount = document.getElementById("btn-collection-count");
  if (btnColCount && state) btnColCount.textContent = state.collection ? state.collection.length : 0;
};

// --- COLLECTION SÉCURISÉE AVEC EMPILAGE ET CLIC ---
window.openCollectionScreen = () => {
  try {
    const gachaKey = "tabi-gacha-v1";
    const state = JSON.parse(localStorage.getItem(gachaKey)) || { collection: [] };
    const col = state.collection || [];
    
    const container = document.getElementById("collection-content");
    if (!container) return;

    if (col.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#64748b;font-size:0.8rem;">Aucune donnée extraite.<br>Marchez pour gagner des tirages.</div>`;
    } else {
      const validCards = col.filter(city => city && typeof city === 'object');
      
      const grouped = {};
      validCards.forEach(city => {
        const name = city.name || "Inconnu";
        if (!grouped[name]) {
          grouped[name] = { city: city, count: 0 };
        }
        grouped[name].count += 1;
      });
      
      const groupedArray = Object.values(grouped).reverse();
      container.innerHTML = groupedArray.map(item => buildCard(item.city, false, item.count)).join('');
    }
    document.getElementById("collection-screen").style.display = "flex";
  } catch (err) {
    console.error("Erreur ouverture collection:", err);
  }
};

window.closeCollectionScreen = () => {
  document.getElementById("collection-screen").style.display = "none";
};

window.viewCollectionCard = (cityName) => {
  const gachaKey = "tabi-gacha-v1";
  const state = JSON.parse(localStorage.getItem(gachaKey));
  if (!state || !state.collection) return;
  
  const city = state.collection.find(c => c.name === cityName);
  if (!city) return;

  const overlay = document.getElementById("draw-overlay");
  const wrap = document.getElementById("reveal-card-wrap");
  const label = document.getElementById("reveal-label");
  const btn = document.getElementById("reveal-close-btn");

  if(overlay && wrap && label && btn) {
    wrap.innerHTML = buildCard(city, true);
    label.innerHTML = "ARCHIVE SÉCURISÉE"; 
    
    overlay.style.zIndex = "2000";
    overlay.style.display = "flex";
    
    setTimeout(() => {
      overlay.style.backgroundColor = "rgba(4, 8, 20, 0.95)";
      wrap.style.transform = "rotateY(0deg) scale(1)";
      wrap.style.opacity = "1";
    }, 50);

    setTimeout(() => {
      label.style.color = "rgba(255,255,255,0.8)";
      btn.style.opacity = "1";
    }, 400);
  }
};
