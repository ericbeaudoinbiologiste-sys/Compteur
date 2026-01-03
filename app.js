/************************************************************
 * app.js — Minuteur d'entraînement (PWA) — Version complète
 *
 * Fonctionnalités:
 * 1) Réglages: Préparation / Travail / Repos / Cooldown / #Intervalles / Bips
 * 2) "Deux pages" (2 vues dans le même index.html):
 *    - Réglages + checklist des exercices
 *    - Chrono
 * 3) Travail: affiche un exercice aléatoire AVEC remise, tiré dans la liste cochée
 * 4) Bips dans les dernières secondes du Travail (Web Audio)
 * 5) Empêche la veille (Screen Wake Lock) si supporté
 * 6) Sauvegarde des réglages + exercices dans localStorage
 *
 * IMPORTANT:
 * - L'audio et le wake lock doivent être déclenchés après une interaction utilisateur.
 * - Sur iOS, le wake lock et/ou l'audio peuvent être moins fiables selon la version.
 ************************************************************/

/***********************
 * CONFIG / CONSTANTES
 ************************/

// Liste d'exercices par défaut (avec "enabled" pour la checklist)
function uid() {
  return `ex_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const DEFAULT_EXERCISES = [
  { id: uid(), name: "Base", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Side straddle", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "ciseaux", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Genoux", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Course", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Sur 1 pied", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Side-swing", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "360", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "360-Entre les jambes", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Croisé-base", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Croisé-boxer", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Croisé-course", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Happy feet", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "boxer", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Entre les jambes", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "X-motion", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Shuffle", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Pyramide", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Double-unders", enabled: true, equipment: "corde", level: "moyen" },
  
  
];


// Réglages par défaut
const DEFAULTS = {
  prepSec: 10,
  workSec: 30,
  restSec: 15,
  cooldownSec: 30,
  rounds: 8,
  beepLast: 3,
  exercises: DEFAULT_EXERCISES
};

// Clé de stockage local
const LS_KEY = "interval_timer_settings_v3";

/***********************
 * PRESETS (modèles) — localStorage
 ************************/

const PRESETS_KEY = "interval_timer_presets_v1";

function uidPreset() {
  return `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadPresetStore() { ... }
function savePresetStore(store) { ... }
function getPresetById(id) { ... }
function upsertPreset(preset) { ... }
function setLastPreset(id) { ... }
function ensureDefaultPresetIfEmpty() { ... }


/***********************
 * RÉFÉRENCES UI (DOM)
 ************************/
const el = {
  // Vues
  viewSettings: document.getElementById("viewSettings"),
  viewTimer: document.getElementById("viewTimer"),
  viewPresets: document.getElementById("viewPresets"),

  // Inputs réglages
  prepSec: document.getElementById("prepSec"),
  workSec: document.getElementById("workSec"),
  restSec: document.getElementById("restSec"),
  cooldownSec: document.getElementById("cooldownSec"),
  rounds: document.getElementById("rounds"),
  beepLast: document.getElementById("beepLast"),

  // Checklist exercices
  exerciseList: document.getElementById("exerciseList"),

  // Boutons réglages
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  goTimerBtn: document.getElementById("goTimerBtn"),

  // Affichage chrono
  phaseLabel: document.getElementById("phaseLabel"),
  roundLabel: document.getElementById("roundLabel"),
  timeLabel: document.getElementById("timeLabel"),
  exerciseLabel: document.getElementById("exerciseLabel"),

  // Boutons chrono
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  skipBtn: document.getElementById("skipBtn"),
  stopBtn: document.getElementById("stopBtn"),
  backBtn: document.getElementById("backBtn"),

  // Ajouts exercise
  exName: document.getElementById("exName"),
  exEquipment: document.getElementById("exEquipment"),
  exLevel: document.getElementById("exLevel"),
  addExerciseBtn: document.getElementById("addExerciseBtn"),
  
  filterEquipment: document.getElementById("filterEquipment"),
  filterLevel: document.getElementById("filterLevel"),

  // liste presets
  presetList: document.getElementById("presetList"),
  newPresetBtn: document.getElementById("newPresetBtn"),

  // édition preset
  presetName: document.getElementById("presetName"),
  savePresetBtn: document.getElementById("savePresetBtn"),
  usePresetBtn: document.getElementById("usePresetBtn"),
  backToPresetsBtn: document.getElementById("backToPresetsBtn"),
};

/***********************
 * ÉTAT RUNTIME (session)
 ************************/
let timerId = null;       // setInterval id
let isRunning = false;    // session en cours (même si "done" on garde true pour afficher)
let isPaused = false;     // pause

let phase = "idle";       // idle | prep | work | rest | cooldown | done
let remaining = 0;        // secondes restantes dans la phase courante
let roundsTotal = 0;      // # total d'intervalles (work+rest)
let roundIndex = 0;       // index de l'intervalle de travail actuel (1..roundsTotal)
let currentExercise = "—";// exercice affiché en phase "work"
let beepLast = DEFAULTS.beepLast;

let editingPresetId = null;


// Exercices (état de la checklist en mémoire)
let exercisesState = DEFAULT_EXERCISES.map(x => ({ ...x }));
let nextExercise = "—";


/***********************
 * UTILITAIRES
 ************************/

function clampInt(v, min, max) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function fmtTime(sec) {
  const s = Math.max(0, sec);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function phaseLabelFr(p) {
  switch (p) {
    case "prep": return "Préparation";
    case "work": return "Activité";
    case "rest": return "Pause";
    case "cooldown": return "Retour au calme";
    case "done": return "Terminé";
    default: return "—";
  }
}

/***********************
 * UI HELPERS
 ************************/

function showPresets() {
  document.body.classList.remove("timer-only");
  el.viewPresets.classList.remove("hidden");
  el.viewSettings.classList.add("hidden");
  el.viewTimer.classList.add("hidden");
}

function showSettings() {
  document.body.classList.remove("timer-only");
  el.viewPresets.classList.add("hidden");
  el.viewSettings.classList.remove("hidden");
  el.viewTimer.classList.add("hidden");
}

function showTimer() {
  document.body.classList.add("timer-only");
  el.viewPresets.classList.add("hidden");
  el.viewSettings.classList.add("hidden");
  el.viewTimer.classList.remove("hidden");
}


/**
 * Applique une classe CSS sur <body> selon la phase.
 * Ceci permet de colorer l'interface du chrono (bordures, glow, etc.)
 */
function setPhaseClass(p) {
  document.body.classList.remove(
    "phase-prep",
    "phase-work",
    "phase-rest",
    "phase-cooldown",
    "phase-done"
  );

  if (p === "prep") document.body.classList.add("phase-prep");         // bleu
  else if (p === "work") document.body.classList.add("phase-work");    // vert
  else if (p === "rest") document.body.classList.add("phase-rest");    // rouge
  else if (p === "cooldown") document.body.classList.add("phase-cooldown"); // bleu
  else if (p === "done") document.body.classList.add("phase-done");
}

/**
 * Active/désactive les boutons selon l'état.
 */
function setButtons({ running, paused }) {
  // start: désactivé si on roule et pas en pause
  el.startBtn.disabled = running && !paused;

  // pause/skip/stop actifs seulement si session active
  el.pauseBtn.disabled = !running;
  el.skipBtn.disabled = !running;
  el.stopBtn.disabled = !running;

  // texte du bouton pause
  el.pauseBtn.textContent = paused ? "Reprendre" : "Pause";
}

/**
 * Rafraîchit tout l'affichage de la vue Chrono.
 * -> Un seul endroit qui "reflète" l'état runtime.
 */
function updateUI() {
  setPhaseClass(phase);

  el.phaseLabel.textContent = phaseLabelFr(phase);
  el.timeLabel.textContent = fmtTime(remaining);

  // Exercice seulement en phase work
  if (phase === "work") {
  el.exerciseLabel.textContent = currentExercise;
} else if (phase === "rest") {
  el.exerciseLabel.textContent = `Next – ${nextExercise}`;
} else {
  el.exerciseLabel.textContent = "—";
}


  // Affichage intervalles
  if (phase === "idle") el.roundLabel.textContent = "—";
  else if (phase === "done") el.roundLabel.textContent = `${roundsTotal}/${roundsTotal}`;
  else el.roundLabel.textContent = `${Math.min(roundIndex, roundsTotal)}/${roundsTotal}`;
}

// Usage des modèles
function presetMetaText(s) {
  return `${s.rounds}x · ${s.workSec}/${s.restSec}s · prep ${s.prepSec}s · cool ${s.cooldownSec}s`;
}

function renderPresetList() {
  const store = loadPresetStore();
  el.presetList.innerHTML = "";

  store.presets.forEach(p => {
    const div = document.createElement("div");
    div.className = "presetItem";
    div.innerHTML = `
      <div>
        <div class="presetName">${p.name}</div>
        <div class="presetMeta">${presetMetaText(p.settings)}</div>
      </div>
      <div class="presetActions">
        <button class="btn secondary" data-act="use" data-id="${p.id}">Utiliser</button>
        <button class="btn ghost" data-act="edit" data-id="${p.id}">Modifier</button>
      </div>
    `;
    el.presetList.appendChild(div);
  });
}


function openPresetForEdit(presetId) {
  const p = getPresetById(presetId);
  if (!p) return;

  editingPresetId = p.id;
  el.presetName.value = p.name;

  // Injecter settings dans l'UI existante
  settingsToUI(p.settings);

  showSettings();
}


function openNewPreset() {
  editingPresetId = null;
  el.presetName.value = "";

  // partir d'un défaut propre
  settingsToUI({
    prepSec: DEFAULTS.prepSec,
    workSec: DEFAULTS.workSec,
    restSec: DEFAULTS.restSec,
    cooldownSec: DEFAULTS.cooldownSec,
    rounds: DEFAULTS.rounds,
    beepLast: DEFAULTS.beepLast,
    exercises: DEFAULT_EXERCISES.map(x => ({ ...x }))
  });

  showSettings();
}


function saveCurrentPresetFromUI() {
  const name = (el.presetName.value || "").trim() || "Sans nom";
  const settings = settingsFromUI();

  const preset = {
    id: editingPresetId || uidPreset(),
    name,
    settings
  };

  upsertPreset(preset);
  editingPresetId = preset.id;
}


function usePreset(presetId) {
  const p = getPresetById(presetId);
  if (!p) return;

  // Mettre l'UI et l'état exercices à jour
  settingsToUI(p.settings);

  // garder trace du dernier choisi
  setLastPreset(p.id);

  showTimer();
}


/***********************
 * CHECKLIST EXERCICES
 ************************/

/**
 * Construit la liste à cocher dans la vue Réglages.
 * On l'appelle au chargement + quand on recharge les settings.
 */

// 1) Traduction des labels (présentation)
function equipmentLabel(v) {
  if (v === "corde") return "Corde à sauter";
  if (v === "punching_bag") return "Punching bag";
  if (v === "aucun") return "Sans équipement";
  return v;
}

function levelLabel(v) {
  if (v === "simple") return "Simple";
  if (v === "moyen") return "Moyen";
  if (v === "avance") return "Avancé";
  return v;
}

// 2) Filtrage pour l'affichage (UI)
function getFilteredExercises() {
  const eq = el.filterEquipment ? el.filterEquipment.value : "all";
  const lvl = el.filterLevel ? el.filterLevel.value : "all";

  return exercisesState.filter(ex => {
    if (eq !== "all" && ex.equipment !== eq) return false;
    if (lvl !== "all" && ex.level !== lvl) return false;
    return true;
  });
}

// 3) Rendu de la checklist (utilise les helpers ci-dessus)

function renderExerciseChecklist() {
  if (!el.exerciseList) return;
  el.exerciseList.innerHTML = "";

  const list = getFilteredExercises();

  if (!list.length) {
    el.exerciseList.innerHTML = `<p class="muted">Aucun exercice pour ce filtre.</p>`;
    return;
  }

  // groupement: equipment -> level -> items
  const groups = new Map();
  for (const ex of list) {
    if (!groups.has(ex.equipment)) groups.set(ex.equipment, new Map());
    const byLevel = groups.get(ex.equipment);
    if (!byLevel.has(ex.level)) byLevel.set(ex.level, []);
    byLevel.get(ex.level).push(ex);
  }

  // Ordre souhaité (optionnel)
  const equipmentOrder = ["aucun", "corde", "punching_bag"];
  const levelOrder = ["simple", "moyen", "avance"];

  const equipments = [...groups.keys()].sort(
    (a,b) => (equipmentOrder.indexOf(a) - equipmentOrder.indexOf(b)) || a.localeCompare(b)
  );

  for (const eq of equipments) {
    const eqTitle = document.createElement("h4");
    eqTitle.className = "h4";
    eqTitle.textContent = equipmentLabel(eq);
    el.exerciseList.appendChild(eqTitle);

    const byLevel = groups.get(eq);
    const levels = [...byLevel.keys()].sort(
      (a,b) => (levelOrder.indexOf(a) - levelOrder.indexOf(b)) || a.localeCompare(b)
    );

    for (const lvl of levels) {
      const lvlTitle = document.createElement("div");
      lvlTitle.className = "group-subtitle";
      lvlTitle.textContent = levelLabel(lvl);
      el.exerciseList.appendChild(lvlTitle);

      const wrap = document.createElement("div");
      wrap.className = "checklist";
      el.exerciseList.appendChild(wrap);

      for (const ex of byLevel.get(lvl)) {
        const row = document.createElement("label");
        row.className = "check";
        row.innerHTML = `
          <input type="checkbox" ${ex.enabled ? "checked" : ""} data-id="${ex.id}">
          <span>${ex.name}</span>
          <span class="pill">${equipmentLabel(ex.equipment)} · ${levelLabel(ex.level)}</span>
        `;
        wrap.appendChild(row);
      }
    }
  }
}


/**
 * Liste des exercices cochés (names).
 * Avertissement: si rien n'est coché, on retourne toute la liste
 * (sinon, on tombe sur une liste vide -> crash du random).
 */
function enabledExercises() {
  const enabled = exercisesState.filter(e => e.enabled);
  // si rien n'est coché, fallback = tout (sinon random sur vide)
  return enabled.length ? enabled : exercisesState;
}

/**
 * Tirage aléatoire AVEC remise.
 * -> Chaque intervalle de travail peut répéter un exercice.
 */
function pickExerciseWithReplacement() {
  const list = enabledExercises();
  const idx = Math.floor(Math.random() * list.length);
  return list[idx].name;
}

/***********************
 * AUDIO (Web Audio)
 ************************/
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

/**
 * Bip court et discret.
 * On utilise un oscillateur -> pas besoin de fichiers audio.
 */
function beep({ freq = 880, durationMs = 90, volume = 0.12 } = {}) {
  if (!audioCtx) return;

  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);

  // enveloppe rapide anti "click"
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

/***********************
 * WAKE LOCK (anti-veille)
 ************************/
let wakeLock = null;

async function requestWakeLock() {
  try {
    if (!("wakeLock" in navigator)) return;
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch (e) {
    wakeLock = null; // pas bloquant
  }
}

async function releaseWakeLock() {
  try {
    if (wakeLock) await wakeLock.release();
  } catch (e) {}
  wakeLock = null;
}

// Si l'onglet revient au premier plan, tenter de redemander le wake lock
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && isRunning && !isPaused && !wakeLock) {
    await requestWakeLock();
  }
});

/***********************
 * SETTINGS (localStorage)
 ************************/

function normalizeExercises(arr) {
  // Conserve (name, enabled) et protège contre des données invalides
  if (!Array.isArray(arr) || arr.length === 0) {
    return DEFAULT_EXERCISES.map(x => ({ ...x }));
  }
  return arr.map(e => ({
    id: String(e.id ?? uid()),
    name: String(e.name ?? "").trim(),
    enabled: !!e.enabled,
    equipment: String(e.equipment ?? "aucun"),
    level: String(e.level ?? "simple")
  })).filter(e => e.name.length > 0);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS, exercises: DEFAULT_EXERCISES };

    const obj = JSON.parse(raw);

    return {
      prepSec: clampInt(obj.prepSec ?? DEFAULTS.prepSec, 0, 3600),
      workSec: clampInt(obj.workSec ?? DEFAULTS.workSec, 1, 3600),
      restSec: clampInt(obj.restSec ?? DEFAULTS.restSec, 0, 3600),
      cooldownSec: clampInt(obj.cooldownSec ?? DEFAULTS.cooldownSec, 0, 3600),
      rounds: clampInt(obj.rounds ?? DEFAULTS.rounds, 1, 200),
      beepLast: clampInt(obj.beepLast ?? DEFAULTS.beepLast, 0, 10),
      exercises: normalizeExercises(obj.exercises)
    };
  } catch {
    return { ...DEFAULTS, exercises: DEFAULT_EXERCISES };
  }
}

function saveSettings(s) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function settingsFromUI() {
  return {
    prepSec: clampInt(el.prepSec.value, 0, 3600),
    workSec: clampInt(el.workSec.value, 1, 3600),
    restSec: clampInt(el.restSec.value, 0, 3600),
    cooldownSec: clampInt(el.cooldownSec.value, 0, 3600),
    rounds: clampInt(el.rounds.value, 1, 200),
    beepLast: clampInt(el.beepLast.value, 0, 10),
    exercises: exercisesState.map(e => ({ name: e.name, enabled: e.enabled }))
  };
}

function settingsToUI(s) {
  // Durées + paramètres
  el.prepSec.value = (s.prepSec ?? DEFAULTS.prepSec);
  el.workSec.value = (s.workSec ?? DEFAULTS.workSec);
  el.restSec.value = (s.restSec ?? DEFAULTS.restSec);
  el.cooldownSec.value = (s.cooldownSec ?? DEFAULTS.cooldownSec);
  el.rounds.value = (s.rounds ?? DEFAULTS.rounds);
  el.beepLast.value = (s.beepLast ?? DEFAULTS.beepLast);

  // Exercices (fallback si vide)
  exercisesState = normalizeExercises(s.exercises);
  if (!exercisesState.length) {
    exercisesState = DEFAULT_EXERCISES.map(x => ({ ...x }));
  }

  renderExerciseChecklist();
}


/***********************
 * LOGIQUE MÉTIER (MINUTEUR)
 ************************/

/**
 * Démarre une session:
 * - lock settings (on sauvegarde)
 * - init audio + wake lock
 * - initialise la première phase
 */
function startSession() {
  // IMPORTANT: on "verrouille" les settings au départ de la session
  const s = settingsFromUI();
  saveSettings(s);

  beepLast = s.beepLast;
  roundsTotal = s.rounds;
  roundIndex = 0;

  isRunning = true;
  isPaused = false;

  // Déclenché suite au clic -> OK pour mobile
  initAudio();
  requestWakeLock();

  // Définir première phase
  if (s.prepSec > 0) {
    phase = "prep";
    remaining = s.prepSec;
    currentExercise = "—";
  } else {
    phase = "work";
    roundIndex = 1;
    currentExercise = pickExerciseWithReplacement();
    remaining = s.workSec;
  }

  setButtons({ running: true, paused: false });
  updateUI();

  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

/**
 * Stoppe et remet à zéro.
 */
function stopSession() {
  clearInterval(timerId);
  timerId = null;

  isRunning = false;
  isPaused = false;

  phase = "idle";
  remaining = 0;
  roundsTotal = 0;
  roundIndex = 0;
  currentExercise = "—";

  releaseWakeLock();

  setButtons({ running: false, paused: false });
  updateUI();
}

/**
 * Pause / Reprise.
 */
function togglePause() {
  if (!isRunning) return;

  isPaused = !isPaused;

  if (isPaused) {
    clearInterval(timerId);
    timerId = null;
    releaseWakeLock();
  } else {
    initAudio();
    requestWakeLock();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  setButtons({ running: true, paused: isPaused });
  updateUI();
}

/**
 * Passe immédiatement à la phase suivante.
 */
function skipPhase() {
  if (!isRunning) return;
  remaining = 0;
  transitionNext();
  updateUI();
}

/**
 * Tick 1 seconde:
 * - bips si on est en "work" dans les dernières secondes
 * - décrémente
 * - si fin -> transition
 */
function tick() {
  if (!isRunning || isPaused) return;

  // Bips dernières secondes du travail (ex: 3-2-1)
  if (phase === "work" && beepLast > 0 && remaining <= beepLast && remaining > 0) {
    beep({ freq: 880, volume: 0.04 });
  }

  updateUI();

  remaining -= 1;

  // Quand on passe sous 0, on change de phase
  if (remaining < 0) {
    transitionNext();
    updateUI();
  }
}

/**
 * Transition de phase:
 * prep -> work
 * work -> rest (si restSec>0) ou work suivant / cooldown / done
 * rest -> work suivant / cooldown / done
 * cooldown -> done
 */
function transitionNext() {
  const s = loadSettings(); // on reprend les settings sauvegardés (verrouillés au start)
  // NB: on pourrait aussi conserver "s" dans une variable globale au start
  // mais loadSettings est simple et assez léger ici.

  if (phase === "prep") {
    phase = "work";
    roundIndex = 1;
    // Si un prochain exercice a déjà été choisi (pendant le repos), on l'utilise.
    if (nextExercise && nextExercise !== "—") {
    currentExercise = nextExercise;
    } else {
    currentExercise = pickExerciseWithReplacement();
    }
    nextExercise = "—"; // on le vide, il sera recalculé au prochain repos

    remaining = s.workSec;
    return;
  }

 if (phase === "work") {
  // Après un work : repos si défini
  if (s.restSec > 0) {
    // On prépare l'exercice du prochain "work" pendant le repos (tirage avec remise)
    nextExercise = pickExerciseWithReplacement();

    phase = "rest";
    remaining = s.restSec;
    return;
  }

  // Pas de repos -> enchaîner ou finir
  if (roundIndex < roundsTotal) {
    phase = "work";
    roundIndex += 1;

    // Pas de phase repos pour préparer "next", donc on choisit maintenant
    currentExercise = pickExerciseWithReplacement();
    nextExercise = "—";

    remaining = s.workSec;
    return;
  }

  // Fin des rounds -> cooldown ou done
  if (s.cooldownSec > 0) {
    phase = "cooldown";
    remaining = s.cooldownSec;
    return;
  }

  phase = "done";
  finish();
  return;
}


  if (phase === "rest") {
    // Après repos: work suivant ou fin
    if (roundIndex < roundsTotal) {
      phase = "work";
      roundIndex += 1;
      currentExercise = pickExerciseWithReplacement();
      remaining = s.workSec;
      return;
    }

    if (s.cooldownSec > 0) {
      phase = "cooldown";
      remaining = s.cooldownSec;
      return;
    }

    phase = "done";
    finish();
    return;
  }

  if (phase === "cooldown") {
    phase = "done";
    finish();
    return;
  }
}

/**
 * Fin de session:
 * - stop le timer
 * - bip de fin
 * - libère le wake lock
 * - laisse l'écran en état "Terminé" (l'utilisateur peut Stop)
 */
function finish() {
  clearInterval(timerId);
  timerId = null;

  initAudio();
  beep({ freq: 660, volume: 0.06, durationMs: 120 });
  setTimeout(() => beep({ freq: 990, volume: 0.06, durationMs: 120 }), 180);

  // On garde la session "affichée", mais on met en pause
  isRunning = true;
  isPaused = true;

  releaseWakeLock();

  setButtons({ running: true, paused: true });
}

/***********************
 * INIT / EVENTS
 ************************/

function init() {
  // Charger settings au lancement
  const s = loadSettings();
  settingsToUI(s);
  renderExerciseChecklist();


  // Vues: on commence par Réglages
  showSettings();

  // État initial
  phase = "idle";
  remaining = 0;
  updateUI();
  setButtons({ running: false, paused: false });

  /*********
   * Events Réglages
   *********/

  // Sauver
  el.saveBtn.addEventListener("click", () => {
    const s2 = settingsFromUI();
    saveSettings(s2);
  });

  // Réinitialiser
  el.resetBtn.addEventListener("click", () => {
    saveSettings({ ...DEFAULTS, exercises: DEFAULT_EXERCISES });
    settingsToUI({ ...DEFAULTS, exercises: DEFAULT_EXERCISES });
  });

  // Aller au chrono (page 2)
  el.goTimerBtn.addEventListener("click", () => {
    const s2 = settingsFromUI();
    saveSettings(s2);
    showTimer();
  });

  // Checklist: écouter les changements (event delegation)
  el.exerciseList.addEventListener("change", (ev) => {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement)) return;
  const id = t.dataset.id;
  if (!id) return;

  const ex = exercisesState.find(x => x.id === id);
  if (!ex) return;

  ex.enabled = t.checked;
  saveSettings(settingsFromUI()); // optionnel: autosave
});

  // Ajouter un exercices
  el.addExerciseBtn.addEventListener("click", () => {
  const name = (el.exName.value || "").trim();
  const equipment = el.exEquipment.value;
  const level = el.exLevel.value;

  if (!name) return; // tu peux afficher un message si tu veux

  // éviter doublons exacts (mauvaise idée de laisser gonfler sans contrôle)
  const exists = exercisesState.some(e => e.name.toLowerCase() === name.toLowerCase()
    && e.equipment === equipment && e.level === level);
  if (exists) return;

  exercisesState.push({
    id: uid(),
    name,
    enabled: true,
    equipment,
    level
  });

  // reset champ
  el.exName.value = "";

  // sauvegarde + rerender
  saveSettings(settingsFromUI());
  renderExerciseChecklist();
});


  /*********
   * Events Chrono
   *********/

  el.startBtn.addEventListener("click", () => startSession());
  el.pauseBtn.addEventListener("click", () => togglePause());
  el.skipBtn.addEventListener("click", () => skipPhase());
  el.stopBtn.addEventListener("click", () => stopSession());

  // Retour aux réglages
  // (Option simple: on autorise même si session en cours)
  el.backBtn.addEventListener("click", () => showSettings());

  /*********
   * Service Worker
   *********/
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

// Lancer l'app
init();
