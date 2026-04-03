// js/missions.js

// On change la clé pour forcer une réinitialisation propre chez tes joueurs
const MISSION_KEY = "tabi-daily-missions-v2";

// Une grande base de missions possibles
const MISSIONS_POOL = [
  { id: 'w1', text: "Marcher 1.0 km", goal: 1.0, type: 'distance', unit: 'km' },
  { id: 'w2', text: "Marcher 2.5 km", goal: 2.5, type: 'distance', unit: 'km' },
  { id: 'p1', text: "Photographier 1 monument", goal: 1, type: 'photo', unit: '' },
  { id: 'p2', text: "Photographier 3 monuments", goal: 3, type: 'photo', unit: '' },
  { id: 'c1', text: "Découvrir 0.5% de la ville", goal: 0.5, type: 'coverage', unit: '%' },
  { id: 'c2', text: "Découvrir 1.0% de la ville", goal: 1.0, type: 'coverage', unit: '%' }
];

// Tirer 3 missions aléatoires uniques
function getRandomMissions(count) {
  const shuffled = [...MISSIONS_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(m => ({
    ...m, current: 0, completed: false, rewarded: false
  }));
}

export function initMissions() {
  const today = new Date().toDateString();
  let state = JSON.parse(localStorage.getItem(MISSION_KEY));

  // Nouvelle journée : on génère 3 missions
  if (!state || state.date !== today) {
    state = {
      date: today,
      missions: getRandomMissions(3)
    };
    localStorage.setItem(MISSION_KEY, JSON.stringify(state));
  }
  
  updateMissionsBtnUI(state);
  return state;
}

export function updateMissionProgress(type, value, isAbsolute = false) {
  let state = JSON.parse(localStorage.getItem(MISSION_KEY));
  if (!state) return;

  let hasChanged = false;

  // On met à jour toutes les missions actives qui correspondent à l'action
  state.missions.forEach(mission => {
    if (mission.type === type && !mission.completed) {
      mission.current = isAbsolute ? value : mission.current + value;
      
      if (mission.current >= mission.goal) {
        mission.current = mission.goal;
        mission.completed = true;
      }
      hasChanged = true;
    }
  });

  if (hasChanged) {
    localStorage.setItem(MISSION_KEY, JSON.stringify(state));
    updateMissionsBtnUI(state);
    renderMissionsList(state); // Met à jour le menu s'il est ouvert
    checkRewards(state);
  }
}

function updateMissionsBtnUI(state) {
  const btn = document.getElementById("missions-btn");
  if (!btn) return;

  const completedCount = state.missions.filter(m => m.completed).length;
  const totalCount = state.missions.length;

  btn.textContent = `🎯 Missions (${completedCount}/${totalCount})`;

  if (completedCount === totalCount) {
    btn.classList.add("completed");
    btn.textContent = `✨ Missions terminées`;
  } else {
    btn.classList.remove("completed");
  }
}

function checkRewards(state) {
  let ticketsToGive = 0;

  state.missions.forEach(mission => {
    if (mission.completed && !mission.rewarded) {
      ticketsToGive++;
      mission.rewarded = true;
    }
  });

  if (ticketsToGive > 0) {
    // Sauvegarde de l'état récompensé
    localStorage.setItem(MISSION_KEY, JSON.stringify(state));

    // Ajout des tickets Gacha
    const gachaKey = "tabi-gacha-v1";
    let gachaState = JSON.parse(localStorage.getItem(gachaKey)) || {draws: 0};
    gachaState.draws += ticketsToGive;
    localStorage.setItem(gachaKey, JSON.stringify(gachaState));
    
    // Mise à jour de l'UI
    const drawCountEl = document.getElementById("btn-draws-count");
    if (drawCountEl) drawCountEl.textContent = gachaState.draws;
    document.getElementById("btn-draw-dot").style.display = "inline-block";

    alert(`🎁 Bravo ! Vous avez accompli ${ticketsToGive} mission(s) et gagné ${ticketsToGive} ticket(s) de tirage !`);
  }
}

// --- FONCTIONS POUR LE MENU HTML ---

window.openMissionsScreen = () => {
  document.getElementById("missions-screen").style.display = "flex";
  const state = JSON.parse(localStorage.getItem(MISSION_KEY));
  renderMissionsList(state);
};

window.closeMissionsScreen = () => {
  document.getElementById("missions-screen").style.display = "none";
};

window.renderMissionsList = (state) => {
  const list = document.getElementById("missions-list");
  if (!list || !state) return;

  list.innerHTML = state.missions.map(mission => {
    const pct = (mission.current / mission.goal) * 100;
    const progressText = mission.completed 
      ? "Terminé" 
      : `${mission.type === 'distance' || mission.type === 'coverage' ? mission.current.toFixed(1) : mission.current} / ${mission.goal} ${mission.unit}`;

    return `
      <div class="mission-item ${mission.completed ? 'completed' : ''}">
        <div class="mission-header">
          <div class="mission-title">${mission.text}</div>
          <div class="mission-reward">🎁 1 Tirage</div>
        </div>
        <div style="font-family:'Space Mono',monospace;font-size:0.6rem;color:#cbd5e1;text-align:right;">
          ${progressText}
        </div>
        <div class="mission-progress-bg">
          <div class="mission-progress-bar" style="width: ${Math.min(100, pct)}%;"></div>
        </div>
      </div>
    `;
  }).join('');
};
