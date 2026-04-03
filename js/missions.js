// js/missions.js

const MISSION_KEY = "tabi-daily-mission";

const MISSIONS_POOL = [
  { id: 'walk', text: "Marcher 1.0 km", goal: 1.0, type: 'distance' },
  { id: 'photo', text: "Photographier 1 monument", goal: 1, type: 'photo' },
  { id: 'reveal', text: "Découvrir 0.3% de la ville", goal: 0.3, type: 'coverage' }
];

export function initMissions() {
  const today = new Date().toDateString();
  let state = JSON.parse(localStorage.getItem(MISSION_KEY));

  // Si nouvelle journée ou pas de mission, on en génère une
  if (!state || state.date !== today) {
    const randomMission = MISSIONS_POOL[Math.floor(Math.random() * MISSIONS_POOL.length)];
    state = {
      ...randomMission,
      date: today,
      current: 0,
      completed: false,
      rewarded: false
    };
    localStorage.setItem(MISSION_KEY, JSON.stringify(state));
  }
  
  updateMissionUI(state);
  return state;
}

export function updateMissionProgress(type, value, isAbsolute = false) {
  let state = JSON.parse(localStorage.getItem(MISSION_KEY));
  if (!state || state.completed) return;

  if (state.type === type) {
    state.current = isAbsolute ? value : state.current + value;
    
    if (state.current >= state.goal) {
      state.current = state.goal;
      state.completed = true;
    }
    
    localStorage.setItem(MISSION_KEY, JSON.stringify(state));
    updateMissionUI(state);
    
    if (state.completed && !state.rewarded) {
      triggerReward();
    }
  }
}

function updateMissionUI(state) {
  const container = document.getElementById("mission-container");
  const text = document.getElementById("mission-text");
  const bar = document.getElementById("mission-progress-bar");
  
  if (!container || !text || !bar) return;

  container.style.display = "block";
  text.textContent = state.completed ? "✨ Mission accomplie !" : state.text;
  
  const pct = (state.current / state.goal) * 100;
  bar.style.width = `${Math.min(100, pct)}%`;

  if (state.completed) {
    container.classList.add("completed");
  } else {
    container.classList.remove("completed");
  }
}

function triggerReward() {
  // On récupère le gacha state pour ajouter le ticket
  const gachaKey = "tabi-gacha-v1";
  let gachaState = JSON.parse(localStorage.getItem(gachaKey)) || {draws: 0};
  
  gachaState.draws += 1;
  localStorage.setItem(gachaKey, JSON.stringify(gachaState));
  
  // On marque la mission comme récompensée
  let missionState = JSON.parse(localStorage.getItem(MISSION_KEY));
  missionState.rewarded = true;
  localStorage.setItem(MISSION_KEY, JSON.stringify(missionState));

  // Notification visuelle
  alert("🎁 Mission réussie ! Vous avez gagné 1 ticket de tirage !");
  
  // Forcer la mise à jour de l'affichage des tirages dans la barre de nav
  const drawCountEl = document.getElementById("btn-draws-count");
  if (drawCountEl) drawCountEl.textContent = gachaState.draws;
}
