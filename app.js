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

  // Exercices pour la corde à sauter (à améliorer)
  { id: uid(), name: "Base", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Side straddle", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Ciseaux", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Genoux", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Course", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Sur 1 pied", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Side-swing", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "360", enabled: true, equipment: "corde", level: "avance" },
  { id: uid(), name: "360-Entre les jambes", enabled: true, equipment: "corde", level: "avance" },
  { id: uid(), name: "Croisé-base", enabled: true, equipment: "corde", level: "avance" },
  { id: uid(), name: "Croisé-boxer", enabled: true, equipment: "corde", level: "avance" },
  { id: uid(), name: "Croisé-course", enabled: true, equipment: "corde", level: "avance" },
  { id: uid(), name: "Happy feet", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Boxer", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Entre les jambes", enabled: true, equipment: "corde", level: "avance" },
  { id: uid(), name: "X-motion", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Shuffle", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Pyramide", enabled: true, equipment: "corde", level: "moyen" },
  { id: uid(), name: "Double-unders", enabled: true, equipment: "corde", level: "avance" },
  { id: uid(), name: "Ski", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Side-step", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Cloche", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Heel tap", enabled: true, equipment: "corde", level: "simple" },
  { id: uid(), name: "Backward", enabled: true, equipment: "corde", level: "avance" },
  // Exercices pour le punching bag
  { id: uid(), name: "1-2", enabled: true, equipment: "punching_bag", level: "simple" },
  { id: uid(), name: "1-1-2", enabled: true, equipment: "punching_bag", level: "simple" },
  { id: uid(), name: "2-3-2", enabled: true, equipment: "punching_bag", level: "simple" },
  { id: uid(), name: "3-4", enabled: true, equipment: "punching_bag", level: "simple" },
  { id: uid(), name: "1-2-3-4", enabled: true, equipment: "punching_bag", level: "simple" },
  { id: uid(), name: "1-3-2-3", enabled: true, equipment: "punching_bag", level: "simple" },
  { id: uid(), name: "2-3-6-3", enabled: true, equipment: "punching_bag", level: "simple" },
  { id: uid(), name: "1-2-Round House", enabled: true, equipment: "punching_bag", level: "simple" }, 
  { id: uid(), name: "1-2-Switch-Kick", enabled: true, equipment: "punching_bag", level: "simple" },
  { id: uid(), name: "Low Kick", enabled: true, equipment: "punching_bag", level: "simple" },  
  { id: uid(), name: "Body Kick", enabled: true, equipment: "punching_bag", level: "simple" }, 
  { id: uid(), name: "Head Kick", enabled: true, equipment: "punching_bag", level: "simple" }, 
  { id: uid(), name: "Roundhouse", enabled: true, equipment: "punching_bag", level: "simple" }, 
  { id: uid(), name: "Switch Kick", enabled: true, equipment: "punching_bag", level: "simple" }, 
  { id: uid(), name: "Lead Tead", enabled: true, equipment: "punching_bag", level: "simple" }, 
  { id: uid(), name: "Rear Tead", enabled: true, equipment: "punching_bag", level: "simple" }, 

  // Exercises au sol
  { id: uid(), name: "Squat", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Push-up large (pectoraux)", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Push-up serré / diamond (triceps)", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Push-up pike (épaules)", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Push-up pieds surélevés", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Push-up lent (tempo contrôlé)", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Push-up", enabled: true, equipment: "sol", level: "simple" },
  { id: uid(), name: "Burpees", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Jumping jack", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Crunch", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Bicycle crunch", enabled: true, equipment: "sol", level: "simple" },
  { id: uid(), name: "Crunch", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Mountain climber", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Nage ventre", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Nage dos", enabled: true, equipment: "sol", level: "simple" }, 
  { id: uid(), name: "Planche - coude", enabled: true, equipment: "sol", level: "simple" },
  { id: uid(), name: "Planche - main", enabled: true, equipment: "sol", level: "simple" },
  { id: uid(), name: "Planche sur le côté", enabled: true, equipment: "sol", level: "simple" },
  { id: uid(), name: "Superman hold", enabled: true, equipment: "sol", level: "simple" },
  { id: uid(), name: "Fente avant", enabled: true, equipment: "sol", level: "simple" },
  { id: uid(), name: "Fente latérale", enabled: true, equipment: "sol", level: "simple" },
  { id: uid(), name: "Death bug", enabled: true, equipment: "sol", level: "simple" },

  // BJJ Solo Drill
  { id: uid(), name: "Rock and kick", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Kicking up", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "180 Rock", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Rocking S Sit", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Alternating S Sit", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "The Gyro", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Rope Pull", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Backward shrimp", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "The Granby", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Backward Shoulders Rolls", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Forward Shoulders Rolls", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Bridge", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Explosive Bridge", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Single Leg Bridge", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Bridge & Turn", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Technical Stand-Up", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Shrimp", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Shrimp - 1 pied sur place", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Shrimp - 1 pied reculons", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Shrimp Alternate Foot", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Leg Circles", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Windshield whipper", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Shoulders walk", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Crab Walk", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Triangle", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "180 Triangle", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Double Triangle", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Monkey Shuffle", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Short Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Quick Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Single Side Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Knee Cut With a Follow Through", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Standing Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Long Step", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Pepper Mill", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Pepper Mill - Elbow", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Pepper Mill - Shoulder", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Beer Crawl", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Donkey Kick", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Scorpion Kick", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Ski Slopes", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Spiderman Pushups", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Inch Worm", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Army Crawl", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Step Up from Kneeling", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Standing up from Kneeling", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Double Leg Takedown", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Walrus Walk", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Sprawl", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Sprawl + Double Leg", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Sumo Step", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Single Foot Hop", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Seated Breakfall", enabled: true, equipment: "BJJ_solo", level: "simple" },
  { id: uid(), name: "Breakfall from squat", enabled: true, equipment: "BJJ_solo", level: "simple" },

];


// Réglages par défaut
const DEFAULTS = {
  prepSec: 10,
  workSec: 30,
  restSec: 15,
  cooldownSec: 30,
  rounds: 8,
  beepLast: 3,
  exercises: DEFAULT_EXERCISES,
  sessionEquipment: "none", 
  modifiers: defaultModifiersForEquipment("corde"), // valeur par défaut (sera remplacée selon eq)
  repeatModeEnabled: false,
  repeatScope: "all", // "all" ou "selected"
  repeatLabels: ["G", "D"],



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

function loadPresetStore() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return { presets: [], lastPresetId: null };
    const obj = JSON.parse(raw);
    return {
      presets: Array.isArray(obj.presets) ? obj.presets : [],
      lastPresetId: obj.lastPresetId ?? null
    };
  } catch {
    return { presets: [], lastPresetId: null };
  }
}

function savePresetStore(store) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(store));
}

function getPresetById(id) {
  const store = loadPresetStore();
  return store.presets.find(p => p.id === id) || null;
}

function upsertPreset(preset) {
  const store = loadPresetStore();
  const i = store.presets.findIndex(p => p.id === preset.id);
  if (i >= 0) store.presets[i] = preset;
  else store.presets.unshift(preset);
  store.lastPresetId = preset.id;
  savePresetStore(store);
}

function setLastPreset(id) {
  const store = loadPresetStore();
  store.lastPresetId = id;
  savePresetStore(store);
}

function ensureDefaultPresetIfEmpty() {
  const store = loadPresetStore();
  if (store.presets.length) return;

  const defaultPreset = {
    id: uidPreset(),
    name: "Défaut",
    settings: {
      prepSec: DEFAULTS.prepSec,
      workSec: DEFAULTS.workSec,
      restSec: DEFAULTS.restSec,
      cooldownSec: DEFAULTS.cooldownSec,
      rounds: DEFAULTS.rounds,
      beepLast: DEFAULTS.beepLast,
      exercises: DEFAULT_EXERCISES.map(x => ({ ...x }))
    }
  };

  store.presets = [defaultPreset];
  store.lastPresetId = defaultPreset.id;
  savePresetStore(store);
}


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
  sessionEquipment: document.getElementById("sessionEquipment"),
  exerciseSection: document.getElementById("exerciseSection"),

  // Modificateurs UI
  modsRope: document.getElementById("modsRope"),
  modsBag: document.getElementById("modsBag"),
  ropeWeightedPct: document.getElementById("ropeWeightedPct"),
  bagNormalPct: document.getElementById("bagNormalPct"),
  bagSpeedPct: document.getElementById("bagSpeedPct"),
  bagPowerPct: document.getElementById("bagPowerPct"),
  bagTechPct: document.getElementById("bagTechPct"),
  repeatModeEnabled: document.getElementById("repeatModeEnabled"),
  repeatScope: document.getElementById("repeatScope"),
  repeatLabelsPreset: document.getElementById("repeatLabelsPreset"),

// Affichage modificateur
modifierPill: document.getElementById("modifierPill"),

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
let currentModifier = null; // { id, label, style }
let nextModifier = null;    // idem

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
// Modificateurs
function normalizeWeights(items) {
  const list = items.map(x => ({ ...x, weight: Math.max(0, Number(x.weight) || 0) }));
  const total = list.reduce((a,x) => a + x.weight, 0);
  if (total <= 0) return list; // tous à 0 => tirage retournera null
  // on garde les poids tels quels (pas besoin de forcer total=100)
  return list;
}

function pickWeighted(items) {
  const list = normalizeWeights(items).filter(x => x.weight > 0);
  const total = list.reduce((a,x) => a + x.weight, 0);
  if (!total) return null;

  let r = Math.random() * total;
  for (const it of list) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return list[list.length - 1] || null;
}

function defaultModifiersForEquipment(eq) {
  if (eq === "corde") {
    return [
      { id: "normal", label: "Normal", weight: 75, style: "neutral" },
      { id: "leste", label: "Corde lestée", weight: 25, style: "warn" }
    ];
  }
  if (eq === "punching_bag") {
    return [
      { id: "normal", label: "Normal", weight: 40, style: "neutral" },
      { id: "vitesse", label: "Vitesse", weight: 20, style: "info" },
      { id: "force", label: "Force", weight: 20, style: "danger" },
      { id: "technique", label: "Technique", weight: 20, style: "success" }
    ];
  }
  return [];
}

function isNormalModifier(mod) {
  if (!mod) return true;
  const id = String(mod.id ?? "").toLowerCase();
  const label = String(mod.label ?? "").toLowerCase();
  return id === "normal" || label === "normal";
}

function getModifiersFromUI(eq) {
  if (eq === "corde") {
    const weighted = clampInt(el.ropeWeightedPct?.value ?? 25, 0, 100);
    return [
      { id: "normal", label: "Normal", weight: 100 - weighted, style: "neutral" },
      { id: "leste", label: "Corde lestée", weight: weighted, style: "warn" }
    ];
  }
  if (eq === "punching_bag") {
    return [
      { id: "normal", label: "Normal", weight: clampInt(el.bagNormalPct?.value ?? 40, 0, 100), style: "neutral" },
      { id: "vitesse", label: "Vitesse", weight: clampInt(el.bagSpeedPct?.value ?? 20, 0, 100), style: "info" },
      { id: "force", label: "Force", weight: clampInt(el.bagPowerPct?.value ?? 20, 0, 100), style: "danger" },
      { id: "technique", label: "Technique", weight: clampInt(el.bagTechPct?.value ?? 20, 0, 100), style: "success" }
    ];
  }
  return [];
}

function pickModifierForSettings(s) {
  const eq = s.sessionEquipment ?? "none";
  if (eq === "none") return null;

  const mods = Array.isArray(s.modifiers) ? s.modifiers : defaultModifiersForEquipment(eq);
  return pickWeighted(mods);
}

// Pour répétition gauche-droite
function shouldRepeatExercise(ex, settings) {
  if (!settings.repeatModeEnabled) return false;
  if (settings.repeatScope === "all") return true;
  // selected
  return !!ex.repeatThisExercise;
}
// État: si un exercice doit repasser une 2e fois, on le garde ici
let pendingRepeat = null; // { ex, sideIndex: 2 }

// Labels de côté (tu peux changer)
function sideLabel(sideIndex, s) {
  const labels = s.repeatLabels && s.repeatLabels.length === 2
    ? s.repeatLabels
    : ["Côté A", "Côté B"];
  return labels[sideIndex - 1] || `Côté ${sideIndex}`;
}

function formatExerciseName(ex, sideIndex, s) {
  if (!ex) return "—";
  if (!sideIndex) return ex.name;
  return `${ex.name} — ${sideLabel(sideIndex, s)}`;
}

// Retourne { name, mod } comme ton pickPair(), mais gère la répétition
function pickWorkStepWithRepeat(s) {
  // 1) Si on a une répétition en attente => on renvoie le 2e côté
  if (pendingRepeat?.ex) {
    const ex = pendingRepeat.ex;
    pendingRepeat = null;

    return {
      name: formatExerciseName(ex, 2, s),
      mod: pickModifierForSettings(s)
    };
  }

  // 2) Sinon tirage normal
  const ex = pickExerciseWithReplacement();
  if (!ex) return { name: "—", mod: pickModifierForSettings(s) };

  // 3) Si cet exercice doit être répété => on programme le 2e passage
  if (shouldRepeatExercise(ex, s)) {
    pendingRepeat = { ex, sideIndex: 2 };
    return {
      name: formatExerciseName(ex, 1, s),
      mod: pickModifierForSettings(s)
    };
  }

  // 4) Sinon pas de répétition
  return { name: ex.name, mod: pickModifierForSettings(s) };
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
if (el.modifierPill) {
  const showWork = (phase === "work" && currentModifier && !isNormalModifier(currentModifier));
  const showNext = ((phase === "rest" || phase === "prep") && nextModifier && !isNormalModifier(nextModifier));

  if (showWork) {
    el.modifierPill.classList.remove("hidden");
    el.modifierPill.textContent = currentModifier.label;
    el.modifierPill.dataset.style = currentModifier.style || "neutral";
  } else if (showNext) {
    el.modifierPill.classList.remove("hidden");
    el.modifierPill.textContent = `Next: ${nextModifier.label}`;
    el.modifierPill.dataset.style = nextModifier.style || "neutral";
  } else {
    el.modifierPill.classList.add("hidden");
    el.modifierPill.textContent = "—";
    el.modifierPill.dataset.style = "neutral";
  }
}


  setPhaseClass(phase);

  el.phaseLabel.textContent = phaseLabelFr(phase);
  el.timeLabel.textContent = fmtTime(remaining);

  // Exercice seulement en phase work
if (phase === "work") {
  el.exerciseLabel.textContent = currentExercise;
} else if (phase === "rest" || phase === "prep") {
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
  applyEquipmentUI({ resetChecks: true });
  saveSettings(settingsFromUI());

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

  // IMPORTANT: remettre le minuteur à zéro (sinon Start peut rester bloqué/disabled)
  clearInterval(timerId);
  timerId = null;
  isRunning = false;
  isPaused = false;
  phase = "idle";
  remaining = 0;
  roundsTotal = 0;
  roundIndex = 0;
  currentExercise = "—";
  nextExercise = "—";

  // Charger les settings du modèle dans l'UI
  settingsToUI(p.settings);

  // (optionnel mais propre) garder trace du dernier choisi
  setLastPreset(p.id);

  // Afficher chrono + remettre l'UI des boutons dans un état "prêt à démarrer"
  showTimer();
  setButtons({ running: false, paused: false });
  updateUI();
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
  if (v === "sol") return "Exercices au sol";
  if (v === "BBJ_solo") return "Drill solo BJJ";
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
function applyEquipmentUI({ resetChecks = false } = {}) {
  const eq = el.sessionEquipment ? el.sessionEquipment.value : "none";

  if (resetChecks) {
    setAllExercisesEnabled(false);
    if (eq !== "none") enableOnlyEquipment(eq);
  }

  

  // Si minuteur simple: on cache toute la section exercices
  if (el.exerciseSection) {
    el.exerciseSection.classList.toggle("hidden", eq === "none");
  }

  // Si un équipement est choisi: on force le filtre équipement
  if (eq !== "none" && el.filterEquipment) {
    el.filterEquipment.value = eq;
  }
  if (eq === "none" && el.filterEquipment) {
    el.filterEquipment.value = "all"; // optionnel
  }
  // Modificateurs visibles selon équipement
  el.modsRope?.classList.toggle("hidden", eq !== "corde");
  el.modsBag?.classList.toggle("hidden", eq !== "punching_bag");

  // Re-render la liste si elle est visible
  renderExerciseChecklist();
}

function setAllExercisesEnabled(enabled) {
  exercisesState = exercisesState.map(ex => ({ ...ex, enabled: !!enabled }));
}

function enableOnlyEquipment(eq) {
  // eq: "corde" | "punching_bag" | "none"
  exercisesState = exercisesState.map(ex => {
    const shouldEnable = (eq !== "none") && (ex.equipment === eq);
    return { ...ex, enabled: shouldEnable };
  });
}


function renderExerciseChecklist() {
  if (!el.exerciseList) return;
  el.exerciseList.innerHTML = "";

  const list = getFilteredExercises();

  if (!list.length) {
    el.exerciseList.innerHTML = `<p class="muted">Aucun exercice pour ce filtre.</p>`;
    return;
  }

  // Afficher la case "↻" seulement si:
  // - la répétition est activée
  // - et on est en mode "selected"
  const showRepeatToggle =
    !!el.repeatModeEnabled?.checked &&
    String(el.repeatScope?.value ?? "all") === "selected";

  // groupement: equipment -> level -> items
  const groups = new Map();
  for (const ex of list) {
    if (!groups.has(ex.equipment)) groups.set(ex.equipment, new Map());
    const byLevel = groups.get(ex.equipment);
    if (!byLevel.has(ex.level)) byLevel.set(ex.level, []);
    byLevel.get(ex.level).push(ex);
  }

  // Ordre souhaité (optionnel)
  const equipmentOrder = ["aucun", "corde", "punching_bag", "sol", "BJJ_solo"];
  const levelOrder = ["simple", "moyen", "avance"];

  const equipments = [...groups.keys()].sort(
    (a, b) => (equipmentOrder.indexOf(a) - equipmentOrder.indexOf(b)) || a.localeCompare(b)
  );

  for (const eq of equipments) {
    const eqTitle = document.createElement("h4");
    eqTitle.className = "h4";
    eqTitle.textContent = equipmentLabel(eq);
    el.exerciseList.appendChild(eqTitle);

    const byLevel = groups.get(eq);
    const levels = [...byLevel.keys()].sort(
      (a, b) => (levelOrder.indexOf(a) - levelOrder.indexOf(b)) || a.localeCompare(b)
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

        // Checkbox principal = "inclure l'exercice"
        // Checkbox ↻ = "répéter cet exercice" (seulement si showRepeatToggle)
        row.innerHTML = `
          <input type="checkbox" ${ex.enabled ? "checked" : ""} data-id="${ex.id}" data-field="enabled">
          <span>${ex.name}</span>

          ${
            showRepeatToggle
              ? `
                <span class="pill"
                      style="display:inline-flex; align-items:center; gap:6px; padding:2px 8px;"
                      title="Répéter cet exercice (G/D)">
                  <input type="checkbox"
                         ${ex.repeatThisExercise ? "checked" : ""}
                         data-id="${ex.id}"
                         data-field="repeat"
                         style="width:16px; height:16px; margin:0;">
                  <span style="font-weight:700;">↻</span>
                </span>
              `
              : ""
          }

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
  const eq = el.sessionEquipment ? el.sessionEquipment.value : "aucun";
  if (eq === "none") return []; // minuteur simple -> pas d'exercices

  const enabled = exercisesState.filter(e => e.enabled);
  return enabled.length ? enabled : exercisesState;
}


/**
 * Tirage aléatoire AVEC remise.
 * -> Chaque intervalle de travail peut répéter un exercice.
 */
function pickExerciseWithReplacement() {
  const list = enabledExercises();
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
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
function beep({ freq = 880, durationMs = 90, volume = 0.15 } = {}) {
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
function vibrate(pattern = 50) {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate(pattern);
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
  // Conserve (name, enabled, equipment, level, repeatThisExercise)
  // et protège contre des données invalides
  if (!Array.isArray(arr) || arr.length === 0) {
    return DEFAULT_EXERCISES.map(x => ({
      ...x,
      repeatThisExercise: !!x.repeatThisExercise
    }));
  }

  return arr
    .map(e => ({
      id: String(e.id ?? uid()),
      name: String(e.name ?? "").trim(),
      enabled: !!e.enabled,
      equipment: String(e.equipment ?? "aucun"),
      level: String(e.level ?? "simple"),

      // Nouveau: répétition par exercice (persistée)
      repeatThisExercise: !!e.repeatThisExercise
    }))
    .filter(e => e.name.length > 0);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      // Important: retourner un objet complet et cohérent
      return {
        ...DEFAULTS,
        exercises: DEFAULT_EXERCISES.map(x => ({ ...x, repeatThisExercise: !!x.repeatThisExercise }))
      };
    }

    const obj = JSON.parse(raw);

    const sessionEquipment = String(obj.sessionEquipment ?? DEFAULTS.sessionEquipment);

    // Répétition: valeurs tolérantes + defaults
    const repeatModeEnabled = !!obj.repeatModeEnabled;

    const repeatScopeRaw = String(obj.repeatScope ?? "all").toLowerCase();
    const repeatScope = (repeatScopeRaw === "selected" || repeatScopeRaw === "all")
      ? repeatScopeRaw
      : "all";

    const repeatLabels = (Array.isArray(obj.repeatLabels) && obj.repeatLabels.length === 2)
      ? [String(obj.repeatLabels[0]), String(obj.repeatLabels[1])]
      : ["G", "D"];

    // Modificateurs: si absents, fallback sur défauts selon l'équipement
    const modifiers = Array.isArray(obj.modifiers)
      ? obj.modifiers
      : defaultModifiersForEquipment(sessionEquipment);

    return {
      prepSec: clampInt(obj.prepSec ?? DEFAULTS.prepSec, 0, 3600),
      workSec: clampInt(obj.workSec ?? DEFAULTS.workSec, 1, 3600),
      restSec: clampInt(obj.restSec ?? DEFAULTS.restSec, 0, 3600),
      cooldownSec: clampInt(obj.cooldownSec ?? DEFAULTS.cooldownSec, 0, 3600),
      rounds: clampInt(obj.rounds ?? DEFAULTS.rounds, 1, 200),
      beepLast: clampInt(obj.beepLast ?? DEFAULTS.beepLast, 0, 10),

      exercises: normalizeExercises(obj.exercises),

      sessionEquipment,
      modifiers,

      // Nouveau: répétition
      repeatModeEnabled,
      repeatScope,
      repeatLabels
    };
  } catch {
    // fallback robuste
    return {
      ...DEFAULTS,
      exercises: DEFAULT_EXERCISES.map(x => ({ ...x, repeatThisExercise: !!x.repeatThisExercise }))
    };
  }
}


function saveSettings(s) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function settingsFromUI() {
  const eq = el.sessionEquipment ? el.sessionEquipment.value : "none";

  // --- Répétition: fallback si l'UI n'est pas encore branchée ---
  const repeatModeEnabled =
    el.repeatModeEnabled ? !!el.repeatModeEnabled.checked : false;

  const repeatScope =
    el.repeatScope ? String(el.repeatScope.value || "all") : "all";

  // Labels des côtés (tu pourras les rendre éditables plus tard)
    const repeatLabels = ["G","D"],
  repeatModeEnabled: !!el.repeatModeEnabled?.checked,
  repeatScope: String(el.repeatScope?.value ?? "all"),

  return {
    prepSec: clampInt(el.prepSec.value, 0, 3600),
    workSec: clampInt(el.workSec.value, 1, 3600),
    restSec: clampInt(el.restSec.value, 0, 3600),
    cooldownSec: clampInt(el.cooldownSec.value, 0, 3600),
    rounds: clampInt(el.rounds.value, 1, 200),
    beepLast: clampInt(el.beepLast.value, 0, 10),

    // Type de séance (none / corde / punching_bag / etc.)
    sessionEquipment: eq,

    // Modificateurs (dépend de l'équipement)
    modifiers: getModifiersFromUI(eq),

    // --- Nouveau: paramètres répétition ---
    repeatModeEnabled,
    repeatScope,
    repeatLabels,

    // Exercices complets (important: garder equipment/level + repeatThisExercise)
    exercises: exercisesState.map(e => ({
      id: e.id,
      name: e.name,
      enabled: !!e.enabled,
      equipment: e.equipment,
      level: e.level,
      // Nouveau champ (sera utile quand tu ajouteras la case "répéter cet exercice")
      repeatThisExercise: !!e.repeatThisExercise,
    }))
  };
}


function settingsToUI(s) {
  // 1) Durées + paramètres
  el.prepSec.value = (s.prepSec ?? DEFAULTS.prepSec);
  el.workSec.value = (s.workSec ?? DEFAULTS.workSec);
  el.restSec.value = (s.restSec ?? DEFAULTS.restSec);
  el.cooldownSec.value = (s.cooldownSec ?? DEFAULTS.cooldownSec);
  el.rounds.value = (s.rounds ?? DEFAULTS.rounds);
  el.beepLast.value = (s.beepLast ?? DEFAULTS.beepLast);

  // 2) Type de séance (équipement)
  const eq = String(s.sessionEquipment ?? DEFAULTS.sessionEquipment ?? "none");
  if (el.sessionEquipment) el.sessionEquipment.value = eq;

  // 3) Exercices (fallback si vide)
  exercisesState = normalizeExercises(s.exercises);
  if (!exercisesState.length) {
    exercisesState = DEFAULT_EXERCISES.map(x => ({ ...x }));
  }

  // 4) Modificateurs: remplir les inputs selon l'équipement du modèle
  //    (si absent, fallback sur défauts)
  const mods = Array.isArray(s.modifiers) ? s.modifiers : defaultModifiersForEquipment(eq);

  // Afficher/masquer les panels de modificateurs (si tu les as)
  el.modsRope?.classList.toggle("hidden", eq !== "corde");
  el.modsBag?.classList.toggle("hidden", eq !== "punching_bag");

  if (eq === "corde") {
    // % lestée = weight du mod "leste"
    const w = mods.find(m => m.id === "leste")?.weight ?? 25;
    if (el.ropeWeightedPct) el.ropeWeightedPct.value = clampInt(w, 0, 100);
  } else if (eq === "punching_bag") {
    const getW = (id, def) => clampInt(mods.find(m => m.id === id)?.weight ?? def, 0, 100);
    if (el.bagNormalPct) el.bagNormalPct.value = getW("normal", 40);
    if (el.bagSpeedPct)  el.bagSpeedPct.value  = getW("vitesse", 20);
    if (el.bagPowerPct)  el.bagPowerPct.value  = getW("force", 20);
    if (el.bagTechPct)   el.bagTechPct.value   = getW("technique", 20);
  }

  // 5) Appliquer l'UI dépendante de l'équipement:
  //    - cache/affiche la section exercices
  //    - force le filtre équipement
  //    - rerender checklist
applyEquipmentUI({ resetChecks: false });
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

  pendingRepeat = null;

  // Déclenché suite au clic -> OK pour mobile
  initAudio();
  requestWakeLock();
  // Préparer le 1er exercice (utile pour l'afficher dès la Préparation)
if (s.sessionEquipment !== "none") {
  const nx = pickWorkStepWithRepeat(s);
  nextExercise = nx.name;
  nextModifier = nx.mod;
} else {
  nextExercise = "—";
  nextModifier = null;
}



  // Définir première phase
  if (s.prepSec > 0) {
    phase = "prep";
    remaining = s.prepSec;
    currentExercise = "—";
    currentModifier = null;
  } else {
    phase = "work";
    roundIndex = 1;
    const nx = pickWorkStepWithRepeat(s);
    currentExercise = nx.name;
    currentModifier = nx.mod;

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
    vibrate(40);
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
  const s = loadSettings(); // settings verrouillés au start

const pickPair = () => pickWorkStepWithRepeat(s);


  // === PREP -> WORK ===
  if (phase === "prep") {
    phase = "work";
    roundIndex = 1;

    if (nextExercise && nextExercise !== "—") {
      currentExercise = nextExercise;
      currentModifier = nextModifier;
    } else {
      const nx = pickPair();
      currentExercise = nx.name;
      currentModifier = nx.mod;
    }

    nextExercise = "—";
    nextModifier = null;

    remaining = s.workSec;
    return;
  }

  // === WORK -> REST / WORK / COOLDOWN / DONE ===
  if (phase === "work") {
    const isLastRound = roundIndex >= roundsTotal;

    // Repos seulement si pas dernier round
    if (!isLastRound && s.restSec > 0) {
      const nx = pickPair();
      nextExercise = nx.name;
      nextModifier = nx.mod;

      phase = "rest";
      remaining = s.restSec;
      return;
    }

    // Pas de repos (ou dernier round) -> work suivant si pas fini
    if (!isLastRound) {
      phase = "work";
      roundIndex += 1;

      const nx = pickPair();
      currentExercise = nx.name;
      currentModifier = nx.mod;

      nextExercise = "—";
      nextModifier = null;

      remaining = s.workSec;
      return;
    }

    // Dernier round terminé -> cooldown ou done (sans dernier repos)
    if (s.cooldownSec > 0) {
      phase = "cooldown";
      remaining = s.cooldownSec;

      currentExercise = "—";
      currentModifier = null;
      nextExercise = "—";
      nextModifier = null;
      return;
    }

    phase = "done";
    finish();
    return;
  }

  // === REST -> WORK / COOLDOWN / DONE ===
  if (phase === "rest") {
    // Après repos: on a forcément un prochain work (puisqu'on ne fait pas de repos après le dernier)
    phase = "work";
    roundIndex += 1;

    if (nextExercise && nextExercise !== "—") {
      currentExercise = nextExercise;
      currentModifier = nextModifier;
    } else {
      const nx = pickPair();
      currentExercise = nx.name;
      currentModifier = nx.mod;
    }

    nextExercise = "—";
    nextModifier = null;

    remaining = s.workSec;
    return;
  }

  // === COOLDOWN -> DONE ===
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
function registerSWAndAutoReload() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("./sw.js").catch(() => {});

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

registerSWAndAutoReload();

/***********************
 * INIT / EVENTS
 ************************/

function init() {
  console.log("NULL el:", Object.entries(el).filter(([k,v]) => v === null).map(([k]) => k));
  // Charger settings au lancement
  const s = loadSettings();
  settingsToUI(s);
  renderExerciseChecklist();

  /*********
 * UI Répétition
 *********/
function syncRepeatUI() {
  if (!el.repeatModeEnabled || !el.repeatScope || !el.repeatLabelsPreset) return;

  const on = el.repeatModeEnabled.checked;
  el.repeatScope.disabled = !on;
  el.repeatLabelsPreset.disabled = !on;
}

// listeners
el.repeatModeEnabled?.addEventListener("change", () => {
  syncRepeatUI();
  saveSettings(settingsFromUI());
});

el.repeatScope?.addEventListener("change", () => {
  saveSettings(settingsFromUI());
});

el.repeatLabelsPreset?.addEventListener("change", () => {
  saveSettings(settingsFromUI());
});

// état initial
syncRepeatUI();



  // Presets: s'assurer qu'il y a au moins un modèle puis afficher la liste
  ensureDefaultPresetIfEmpty();
  renderPresetList();
  showPresets();

  // État initial
  phase = "idle";
  remaining = 0;
  updateUI();
  setButtons({ running: false, paused: false });

  /*********
 * Events Modèles (Presets)
 *********/

// Clicks dans la liste (Utiliser / Modifier)
el.presetList.addEventListener("click", (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;

  const act = btn.dataset.act;
  const id = btn.dataset.id;
  if (!id) return;

  if (act === "use") usePreset(id);
  if (act === "edit") openPresetForEdit(id);
});

// Nouveau modèle
el.newPresetBtn.addEventListener("click", () => openNewPreset());

// Retour à la liste
el.backToPresetsBtn.addEventListener("click", () => {
  renderPresetList();
  showPresets();
});

// Enregistrer le modèle (create/update)
el.savePresetBtn.addEventListener("click", () => {
  saveCurrentPresetFromUI();
  renderPresetList();
  showPresets();
});

// Utiliser depuis l'écran d'édition
el.usePresetBtn.addEventListener("click", () => {
  saveCurrentPresetFromUI();     // s'assure que le modèle est bien sauvegardé
  usePreset(editingPresetId);    // puis bascule sur le chrono
});
el.sessionEquipment?.addEventListener("change", () => {
  applyEquipmentUI({ resetChecks: true });
  saveSettings(settingsFromUI());
});




  /*********
   * Events Réglages
   *********/

  // Checklist: écouter les changements (event delegation)
 el.exerciseList.addEventListener("change", (ev) => {
  const t = ev.target;
  if (!(t instanceof HTMLInputElement)) return;

  const id = t.dataset.id;
  if (!id) return;

  const ex = exercisesState.find(x => x.id === id);
  if (!ex) return;

  const field = String(t.dataset.field || "enabled");

  if (field === "repeat") {
    ex.repeatThisExercise = t.checked;
  } else {
    ex.enabled = t.checked;
  }

  saveSettings(settingsFromUI()); // autosave
});

  const saveModsIfAny = () => saveSettings(settingsFromUI());

  el.ropeWeightedPct?.addEventListener("change", saveModsIfAny);
  el.bagNormalPct?.addEventListener("change", saveModsIfAny);
  el.bagSpeedPct?.addEventListener("change", saveModsIfAny);
  el.bagPowerPct?.addEventListener("change", saveModsIfAny);
  el.bagTechPct?.addEventListener("change", saveModsIfAny);


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
  el.backBtn.addEventListener("click", () => {
  stopSession();        // remet tout à zéro + libère wakelock
  renderPresetList();
  showPresets();
});

  /*********
   * Service Worker
   *********/
  // if ("serviceWorker" in navigator) {
  //   window.addEventListener("load", () => {
  //     navigator.serviceWorker.register("./sw.js").catch(() => {});
  //   });
  // }
}


// Lancer l'app
init();
