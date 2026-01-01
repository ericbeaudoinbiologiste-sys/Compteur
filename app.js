/***********************
 * Minuteur Intervalles PWA — MVP
 * - Tirage aléatoire avec remise à chaque intervalle de travail
 * - Bips dernières secondes (Web Audio)
 * - Wake Lock (si dispo)
 ************************/

// 1) Liste d'exercices (modifiable)
const EXERCISES = ["base", "side straddle", "ciseaux", "boxer"];

// 2) Defaults
const DEFAULTS = {
  prepSec: 10,
  workSec: 30,
  restSec: 15,
  cooldownSec: 30,
  rounds: 8,
  beepLast: 3
};

const LS_KEY = "interval_timer_settings_v1";

// UI elements
const el = {
  prepSec: document.getElementById("prepSec"),
  workSec: document.getElementById("workSec"),
  restSec: document.getElementById("restSec"),
  cooldownSec: document.getElementById("cooldownSec"),
  rounds: document.getElementById("rounds"),
  beepLast: document.getElementById("beepLast"),

  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),

  phaseLabel: document.getElementById("phaseLabel"),
  roundLabel: document.getElementById("roundLabel"),
  timeLabel: document.getElementById("timeLabel"),
  exerciseLabel: document.getElementById("exerciseLabel"),

  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  skipBtn: document.getElementById("skipBtn"),
  stopBtn: document.getElementById("stopBtn")
};

// Runtime state
let timerId = null;
let isRunning = false;
let isPaused = false;

let phase = "idle"; // idle | prep | work | rest | cooldown | done
let remaining = 0;  // seconds in current phase
let roundsTotal = 0;
let roundIndex = 0; // 1..roundsTotal (work phases)
let currentExercise = "—";

let beepLast = DEFAULTS.beepLast;

// Audio (Web Audio)
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}

function beep({ freq = 880, durationMs = 90, volume = 0.05 } = {}) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

// Wake Lock
let wakeLock = null;

async function requestWakeLock() {
  try {
    if (!("wakeLock" in navigator)) return;
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch (e) {
    // pas bloquant
    wakeLock = null;
  }
}

async function releaseWakeLock() {
  try {
    if (wakeLock) await wakeLock.release();
  } catch (e) {}
  wakeLock = null;
}

document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && isRunning && !isPaused && !wakeLock) {
    await requestWakeLock();
  }
});

// Utils
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

function pickExerciseWithReplacement() {
  if (!EXERCISES.length) return "—";
  const idx = Math.floor(Math.random() * EXERCISES.length);
  return EXERCISES[idx];
}

// Settings
function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    const obj = JSON.parse(raw);
    return {
      prepSec: clampInt(obj.prepSec ?? DEFAULTS.prepSec, 0, 3600),
      workSec: clampInt(obj.workSec ?? DEFAULTS.workSec, 1, 3600),
      restSec: clampInt(obj.restSec ?? DEFAULTS.restSec, 0, 3600),
      cooldownSec: clampInt(obj.cooldownSec ?? DEFAULTS.cooldownSec, 0, 3600),
      rounds: clampInt(obj.rounds ?? DEFAULTS.rounds, 1, 200),
      beepLast: clampInt(obj.beepLast ?? DEFAULTS.beepLast, 0, 10)
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function settingsFromUI() {
  const s = {
    prepSec: clampInt(el.prepSec.value, 0, 3600),
    workSec: clampInt(el.workSec.value, 1, 3600),
    restSec: clampInt(el.restSec.value, 0, 3600),
    cooldownSec: clampInt(el.cooldownSec.value, 0, 3600),
    rounds: clampInt(el.rounds.value, 1, 200),
    beepLast: clampInt(el.beepLast.value, 0, 10)
  };
  return s;
}

function settingsToUI(s) {
  el.prepSec.value = s.prepSec;
  el.workSec.value = s.workSec;
  el.restSec.value = s.restSec;
  el.cooldownSec.value = s.cooldownSec;
  el.rounds.value = s.rounds;
  el.beepLast.value = s.beepLast;
}

// UI updates
function setButtons({ running, paused }) {
  el.startBtn.disabled = running && !paused;
  el.pauseBtn.disabled = !running;
  el.skipBtn.disabled = !running;
  el.stopBtn.disabled = !running;
  el.pauseBtn.textContent = paused ? "Reprendre" : "Pause";
}

function updateUI() {
  el.phaseLabel.textContent = phaseLabel(phase);
  el.timeLabel.textContent = fmtTime(remaining);

  if (phase === "work") el.exerciseLabel.textContent = currentExercise;
  else el.exerciseLabel.textContent = "—";

  if (phase === "idle") el.roundLabel.textContent = "—";
  else if (phase === "done") el.roundLabel.textContent = `${roundsTotal}/${roundsTotal}`;
  else el.roundLabel.textContent = `${Math.min(roundIndex, roundsTotal)}/${roundsTotal}`;
}

function phaseLabel(p) {
  switch (p) {
    case "prep": return "Préparation";
    case "work": return "Travail";
    case "rest": return "Repos";
    case "cooldown": return "Retour au calme";
    case "done": return "Terminé";
    default: return "—";
  }
}

// State transitions
function startSession() {
  const s = settingsFromUI();
  saveSettings(s);

  beepLast = s.beepLast;
  roundsTotal = s.rounds;
  roundIndex = 0;

  isRunning = true;
  isPaused = false;

  initAudio(); // important: déclenché suite au clic
  requestWakeLock(); // best effort

  // Détermine la première phase
  if (s.prepSec > 0) {
    phase = "prep";
    remaining = s.prepSec;
    currentExercise = "—";
  } else {
    // sauter directement en travail
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

function togglePause() {
  if (!isRunning) return;

  isPaused = !isPaused;

  if (isPaused) {
    clearInterval(timerId);
    timerId = null;
    releaseWakeLock();
  } else {
    initAudio(); // re-résumer audio possible
    requestWakeLock();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  setButtons({ running: true, paused: isPaused });
  updateUI();
}

function skipPhase() {
  if (!isRunning) return;
  // force transition immédiate
  remaining = 0;
  transitionNext();
  updateUI();
}

function tick() {
  if (!isRunning || isPaused) return;

  // bips dernières secondes (ex: 3-2-1) pendant Travail, avant d’atteindre 0
  if (phase === "work" && beepLast > 0 && remaining <= beepLast && remaining > 0) {
    beep({ freq: 880, volume: 0.04 });
  }

  updateUI();

  remaining -= 1;

  if (remaining < 0) {
    transitionNext();
    updateUI();
  }
}

function transitionNext() {
  const s = settingsFromUI(); // lit la config actuelle (tu peux aussi verrouiller au start)

  if (phase === "prep") {
    phase = "work";
    roundIndex = 1;
    currentExercise = pickExerciseWithReplacement();
    remaining = s.workSec;
    return;
  }

  if (phase === "work") {
    // Après travail : soit repos (si rest>0), soit prochain travail, soit cooldown
    if (s.restSec > 0) {
      phase = "rest";
      remaining = s.restSec;
      return;
    }
    // pas de repos => enchaîne
    if (roundIndex < roundsTotal) {
      phase = "work";
      roundIndex += 1;
      currentExercise = pickExerciseWithReplacement();
      remaining = s.workSec;
      return;
    }
    // fini les rounds => cooldown ou done
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
    if (roundIndex < roundsTotal) {
      phase = "work";
      roundIndex += 1;
      currentExercise = pickExerciseWithReplacement();
      remaining = s.workSec;
      return;
    }
    // finis les rounds => cooldown ou done
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

function finish() {
  clearInterval(timerId);
  timerId = null;

  // petit signal de fin
  initAudio();
  beep({ freq: 660, volume: 0.06, durationMs: 120 });
  setTimeout(() => beep({ freq: 990, volume: 0.06, durationMs: 120 }), 180);

  isRunning = true;   // on laisse la session affichée en "Terminé"
  isPaused = true;    // mais on considère stoppé côté timer
  releaseWakeLock();

  setButtons({ running: true, paused: true });
  // On garde phase done à l’écran, l’utilisateur peut Stop pour reset
}

// Wiring
function init() {
  const s = loadSettings();
  settingsToUI(s);

  phase = "idle";
  remaining = 0;
  updateUI();
  setButtons({ running: false, paused: false });

  el.saveBtn.addEventListener("click", () => {
    const s2 = settingsFromUI();
    saveSettings(s2);
  });

  el.resetBtn.addEventListener("click", () => {
    saveSettings({ ...DEFAULTS });
    settingsToUI({ ...DEFAULTS });
  });

  el.startBtn.addEventListener("click", () => startSession());
  el.pauseBtn.addEventListener("click", () => togglePause());
  el.skipBtn.addEventListener("click", () => skipPhase());
  el.stopBtn.addEventListener("click", () => stopSession());

  // PWA: register SW
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

init();
