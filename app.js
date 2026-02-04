/************************************************************
 * app.js — Minuteur d'entraînement (PWA) — Version complète
 *
 ************************************************************/
/************************************************************
 * TABLE DES MATIÈRES
 *
 *  0) En-tête & objectifs
 *
 *  1) CONFIG / CONSTANTES
 *     1.1 uid() + DEFAULT_EXERCISES
 *     1.2 DEFAULTS + clés localStorage (LS_KEY, PRESETS_KEY)
 *
 *  2) PRESETS (modèles) — localStorage
 *     2.1 loadPresetStore() / savePresetStore()
 *     2.2 CRUD: getPresetById(), upsertPreset(), setLastPreset()
 *     2.3 ensureDefaultPresetIfEmpty() + rendu liste
 *
 *  3) RÉFÉRENCES UI (DOM)
 *     3.1 objet el (tous les éléments HTML)
 *
 *  4) ÉTAT RUNTIME (session)
 *     4.1 timers & flags (timerId, isRunning, isPaused)
 *     4.2 état minuteur (phase, remaining, roundsTotal, roundIndex)
 *     4.3 état exercice/modificateur (currentExercise, nextExercise, modifiers)
 *     4.4 état répétition (pendingRepeat)
 *
 *  5) UTILITAIRES GÉNÉRAUX
 *     5.1 clampInt(), fmtTime(), phaseLabelFr()
 *
 *  6) MODIFICATEURS (pondération)
 *     6.1 normalizeWeights(), pickWeighted()
 *     6.2 defaultModifiersForEquipment(), getModifiersFromUI()
 *     6.3 pickModifierForSettings(), isNormalModifier()
 *
 *  7) RÉPÉTITION G/D (exercices)
 *     7.1 shouldRepeatExercise(), sideLabel(), formatExerciseName()
 *     7.2 pickWorkStepWithRepeat()
 *
 *  8) UI HELPERS (navigation)
 *     8.1 showPresets(), showSettings(), showTimer()
 *     8.2 setPhaseClass(), setButtons(), updateUI()
 *
 *  9) CHECKLIST EXERCICES (réglages)
 *     9.1 labels (equipmentLabel, levelLabel)
 *     9.2 filtres (getFilteredExercises, applyEquipmentUI)
 *     9.3 états (setAllExercisesEnabled, enableOnlyEquipment)
 *     9.4 rendu (renderExerciseChecklist)
 *     9.5 sélection (enabledExercises, pickExerciseWithReplacement)
 *
 * 10) AUDIO (MP3)
 *     10.1 initAudio(), stopAudio()
 *     10.2 playBeep(), playBeepLong()
 *
 * 11) WAKE LOCK (anti-veille)
 *     11.1 requestWakeLock(), releaseWakeLock()
 *     11.2 visibilitychange handler
 *
 * 12) SETTINGS (localStorage)
 *     12.1 normalizeExercises()
 *     12.2 loadSettings(), saveSettings()
 *     12.3 settingsFromUI(), settingsToUI()
 *
 * 13) LOGIQUE MINUTEUR (moteur)
 *     13.1 startSession(), stopSession(), togglePause(), skipPhase()
 *     13.2 tick() + bips fin de phase work
 *     13.3 transitionNext() (prep/work/rest/cooldown/done)
 *     13.4 finish()
 *
 * 14) SERVICE WORKER (MAJ auto)
 *     14.1 registerSWAndAutoReload()
 *
 * 15) INIT / EVENTS
 *     15.1 init() (chargement settings, presets, UI initiale)
 *     15.2 listeners: presets, réglages, checklist, filtres, chrono
 *
 ************************************************************/


/***********************
 * 1) CONFIG / CONSTANTES
 ************************/

// Liste d'exercices par défaut (avec "enabled" pour la checklist)
function uid() {
  return `ex_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const DEFAULT_EXERCISES = [

  // Exercices pour la corde à sauter (à améliorer)
  // Trouvé sur https://www.thejumpropecoachchris.com/learn/wraps
  // Simple
  { id: "corde_base", name: "Base", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_side_straddle", name: "Side straddle", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_front_straddle", name: "Front straddle", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_cross_straddle", name: "Cross straddle", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde__ciseaux", name: "Ciseaux", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_boxer", name: "Boxer", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_shuffle", name: "Shuffle", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_pyramide", name: "Pyramide", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_side_step", name: "Side-step", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_cloche", name: "Cloche", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_heel_tap" , name: "Heel tap", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_toe_tap", name: "Toe tap", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_heel_to_toe", name: "Heel to toe", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_freestyle", name: "Freestyle", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_ski", name: "Ski", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_mummy_kick", name: "Mummy kick", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_twister", name: "Twister", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_wounded_duck", name: "Wounded duck", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_kick", name: "Kick", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_swing_kick", name: "Swing Kick", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_can_can_chicago", name: "Can can (Chicago)", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_running_man", name: "Running man", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_running_man_reversed", name: "Running man (reversed)", enabled: true, equipment: "corde", level: "simple" },
  { id: "corde_twister", name: "Twister", enabled: true, equipment: "corde", level: "simple" },

//Moyen
{ id: "corde_genoux", name: "Genoux", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_course", name: "Course", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_sur_1_pied", name: "Sur 1 pied", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_side_swing", name: "Side-swing", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_happy_feet", name: "Happy feet", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_x_motion", name: "X-motion", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_entre_les_jambes", name: "Entre les jambes", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_grapevine_pas_croise", name: "Grapevine(pas croisé)", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_croise_base", name: "Croisé-base", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_croise_x2", name: "Croisé X2", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_swing_180", name: "Swing-180", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_swing_180_cross", name: "Swing 180 Cross", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_dive_180", name: "Dive-180", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_body_stall", name: "Body stall", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_open_stall", name: "Open stall", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_between_the_leg_stall", name: "Between the leg stall", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_backward", name: "Backward", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_kick_back_stall", name: "Kick Back Stall", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_crossed_body_stall", name: "Crossed Body Stall", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_crossed_open_stall", name: "Crossed Open Stall", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_leg_over_body_stall", name: "Leg Over Body Stall", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_leg_over_open_stall", name: "Leg Over Open Stall", enabled: true, equipment: "corde", level: "moyen" },
{ id: "corde_double_under_stall", name: "Double Under Stall", enabled: true, equipment: "corde", level: "moyen" },

// Avance
{ id: "corde_360", name: "360", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_360_entre_les_jambes", name: "360-Entre les jambes", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_switch_cross", name: "Switch cross", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_croise_boxer", name: "Croisé-boxer", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_croise_course", name: "Croisé-course", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_cross_eb_side_swing_mais_un_bras_dans_le_dos", name: "Cross EB (Side swing mais un bras dans le dos)", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_cross_ts_cross_dans_le_dos", name: "Cross TS (cross dans le dos)", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_cross_toad_cross_passe_entre_les_jambes_et_kick", name: "Cross Toad (cross passe entre les jambes et kick)", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_cross_leg_over", name: "Cross Leg Over", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_cross_inversed_toad", name: "Cross Inversed Toad", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_cross_inversed_leg_over", name: "Cross Inversed Leg Over", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_cross_elephant", name: "Cross Elephant", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_eb_toad", name: "EB Toad", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_double_unders", name: "Double-unders", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_texan_360", name: "Texan 360", enabled: true, equipment: "corde", level: "avance" },
{ id: "corde_leg_hook_360", name: "Leg Hook 360", enabled: true, equipment: "corde", level: "avance" },

// Exercices pour le punching bag
{ id: "punching_bag_1_2", name: "1-2", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_1_1_2", name: "1-1-2", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_2_3_2", name: "2-3-2", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_3_4", name: "3-4", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_1_2_3_4", name: "1-2-3-4", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_1_3_2_3", name: "1-3-2-3", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_2_3_6_3", name: "2-3-6-3", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_1_2_round_house", name: "1-2-Round House", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_1_2_switch_kick", name: "1-2-Switch-Kick", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_low_kick", name: "Low Kick", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_body_kick", name: "Body Kick", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_head_kick", name: "Head Kick", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_roundhouse", name: "Roundhouse", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_switch_kick", name: "Switch Kick", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_lead_tead", name: "Lead Tead", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_rear_tead", name: "Rear Tead", enabled: true, equipment: "punching_bag", level: "simple" },
{ id: "punching_bag_shadow_boxing", name: "Shadow boxing", enabled: true, equipment: "punching_bag", level: "simple" },

// Exercises au sol
{ id: "sol_squat", name: "Squat", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_push_up_large_pectoraux", name: "Push-up large (pectoraux)", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_push_up_serre_diamond_triceps", name: "Push-up serré / diamond (triceps)", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_push_up_pike_epaules", name: "Push-up pike (épaules)", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_push_up_pieds_sureleves", name: "Push-up pieds surélevés", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_push_up_lent_tempo_controle", name: "Push-up lent (tempo contrôlé)", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_push_up", name: "Push-up", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_burpees", name: "Burpees", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_jumping_jack", name: "Jumping jack", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_crunch", name: "Crunch", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_bicycle_crunch", name: "Bicycle crunch", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_russian_crunch", name: "Russian crunch", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_mountain_climber", name: "Mountain climber", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_nage_ventre", name: "Nage ventre", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_nage_dos", name: "Nage dos", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_planche_coude", name: "Planche - coude", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_planche_main", name: "Planche - main", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_planche_sur_le_cote", name: "Planche sur le côté", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_superman_hold", name: "Superman hold", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_fente_avant", name: "Fente avant", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_fente_laterale", name: "Fente latérale", enabled: true, equipment: "sol", level: "simple" },
{ id: "sol_death_bug", name: "Death bug", enabled: true, equipment: "sol", level: "simple" },

// BJJ Solo Drill
{ id: "bjj_solo_rock_and_kick", name: "Rock and kick", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_kicking_up", name: "Kicking up", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_180_rock", name: "180 Rock", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_rocking_s_sit", name: "Rocking S Sit", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_alternating_s_sit", name: "Alternating S Sit", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_the_gyro", name: "The Gyro", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_rope_pull", name: "Rope Pull", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_backward_shrimp", name: "Backward shrimp", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_the_granby", name: "The Granby", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_backward_shoulders_rolls", name: "Backward Shoulders Rolls", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_forward_shoulders_rolls", name: "Forward Shoulders Rolls", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_bridge", name: "Bridge", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_explosive_bridge", name: "Explosive Bridge", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_single_leg_bridge", name: "Single Leg Bridge", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_bridge_and_turn", name: "Bridge & Turn", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_technical_stand_up", name: "Technical Stand-Up", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_shrimp", name: "Shrimp", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_shrimp_1_pied_sur_place", name: "Shrimp - 1 pied sur place", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_shrimp_1_pied_reculons", name: "Shrimp - 1 pied reculons", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_shrimp_alternate_foot", name: "Shrimp Alternate Foot", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_leg_circles", name: "Leg Circles", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_windshield_whipper", name: "Windshield whipper", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_shoulders_walk", name: "Shoulders walk", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_crab_walk", name: "Crab Walk", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_triangle", name: "Triangle", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_180_triangle", name: "180 Triangle", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_double_triangle", name: "Double Triangle", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_monkey_shuffle", name: "Monkey Shuffle", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_short_knee_cut", name: "Short Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_knee_cut", name: "Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_quick_knee_cut", name: "Quick Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_single_side_knee_cut", name: "Single Side Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_knee_cut_with_a_follow_through", name: "Knee Cut With a Follow Through", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_standing_knee_cut", name: "Standing Knee Cut", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_long_step", name: "Long Step", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_pepper_mill", name: "Pepper Mill", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_pepper_mill_elbow", name: "Pepper Mill - Elbow", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_pepper_mill_shoulder", name: "Pepper Mill - Shoulder", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_beer_crawl", name: "Beer Crawl", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_donkey_kick", name: "Donkey Kick", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_scorpion_kick", name: "Scorpion Kick", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_ski_slopes", name: "Ski Slopes", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_spiderman_pushups", name: "Spiderman Pushups", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_inch_worm", name: "Inch Worm", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_army_crawl", name: "Army Crawl", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_step_up_from_kneeling", name: "Step Up from Kneeling", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_standing_up_from_kneeling", name: "Standing up from Kneeling", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_double_leg_takedown", name: "Double Leg Takedown", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_walrus_walk", name: "Walrus Walk", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_sprawl", name: "Sprawl", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_sprawl_double_leg", name: "Sprawl + Double Leg", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_sumo_step", name: "Sumo Step", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_single_foot_hop", name: "Single Foot Hop", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_seated_breakfall", name: "Seated Breakfall", enabled: true, equipment: "BJJ_solo", level: "simple" },
{ id: "bjj_solo_breakfall_from_squat", name: "Breakfall from squat", enabled: true, equipment: "BJJ_solo", level: "simple" },

// --- YOGA (cohérence via statesIn/statesOut) ---
//Standing
{ id: "yoga_big_toe_padangushthasana", name: "Big Toe - padangushthasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing"] },
{ id: "yoga_bird_of_paradise_svarga_dvijasana", name: "Bird of Paradise - svarga dvijasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "balance"] },
{ id: "yoga_revolved_bird_of_paradise_parivritta_svarga_dvijasana", name: "Revolved Bird of Paradise - parivritta svarga dvijasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "twist", "balance"] },
{ id: "yoga_chair_utkatasana", name: "Chair - utkatasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 3, tags: ["standing", "strength"] },
{ id: "yoga_crescent_lunge_ashta_chandrasana", name: "Crescent Lunge - ashta chandrasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 3, tags: ["standing", "lunge"] },
{ id: "yoga_crescent_lunge_on_the_knee_anjaneyasana", name: "Crescent Lunge on the Knee - anjaneyasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 3, tags: ["standing", "lunge"] },
{ id: "yoga_crescent_moon_ardha_chandrasana", name: "Crescent Moon - ardha chandrasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "balance"] },
{ id: "yoga_eagle_garudasana", name: "Eagle - garudasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "balance"] },
{ id: "yoga_firefly_ii_tittibhasana_b", name: "Firefly II - tittibhasana b", enabled: true, equipment: "yoga", level: "avance", statesIn: ["standing"], statesOut: ["support", "standing", "inversion"], weight: 2, intensity: 4, tags: ["standing", "arm_balance"] },
{ id: "yoga_firefly_iii_tittibhasana_c", name: "Firefly III - tittibhasana c", enabled: true, equipment: "yoga", level: "avance", statesIn: ["standing"], statesOut: ["support", "standing", "inversion"], weight: 2, intensity: 4, tags: ["standing", "arm_balance"] },
{ id: "yoga_standing_foot_to_head_trivikramasana_a", name: "Standing Foot to Head - trivikramasana a", enabled: true, equipment: "yoga", level: "avance", statesIn: ["standing"], statesOut: ["standing", "seated", "support"], weight: 2, intensity: 4, tags: ["standing", "balance"] },
{ id: "yoga_standing_leg_behind_the_head_forward_bend_richikasana", name: "Standing Leg Behind the Head Forward Bend - richikasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["standing"], statesOut: ["standing", "seated", "support"], weight: 2, intensity: 4, tags: ["standing", "forward_fold", "balance"] },
{ id: "yoga_standing_forward_bend_uttanasana", name: "Standing Forward Bend - uttanasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "forward_fold"] },
{ id: "yoga_standing_half_bound_lotus_forward_bend_ardha_baddha_padmottanasana", name: "Standing Half Bound Lotus Forward Bend - ardha baddha padmottanasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 2, intensity: 2, tags: ["standing", "forward_fold", "balance"] },
{ id: "yoga_goddess_utkata_konasana", name: "Goddess - utkata konasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 3, tags: ["standing", "lunge", "strength"] },
{ id: "yoga_gorilla_pada_hastasana", name: "Gorilla - pada hastasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "forward_fold"] },
{ id: "yoga_half_moon_ardha_chandrasana", name: "Half Moon - ardha chandrasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 3, tags: ["standing", "balance"] },
{ id: "yoga_revolved_half_moon_parivritta_ardha_chandrasana", name: "Revolved Half Moon - parivritta ardha chandrasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 3, tags: ["standing", "twist", "balance"] },
{ id: "yoga_extended_standing_hand_to_big_toe_utthita_hasta_padangushthasana_b", name: "Extended Standing Hand to Big Toe - utthita hasta padangushthasana b", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "balance"] },
{ id: "yoga_revolved_standing_hand_to_big_toe_parivritta_hasta_padangushthasana", name: "Revolved Standing Hand to Big Toe - parivritta hasta padangushthasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "twist", "balance"] },
{ id: "yoga_standing_hand_to_big_toe_utthita_hasta_padangushthasana_a", name: "Standing Hand to Big Toe  - utthita hasta padangushthasana a", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "balance"] },
{ id: "yoga_standing_leg_behind_the_head_durvasasana", name: "Standing Leg Behind the Head - durvasasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["standing"], statesOut: ["standing", "seated", "support"], weight: 2, intensity: 4, tags: ["standing", "balance"] },
{ id: "yoga_mountain_tadasana", name: "Mountain - tadasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 1, tags: ["standing"] },
{ id: "yoga_pyramid_parshvottanasana", name: "Pyramid - parshvottanasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "forward_fold"] },
{ id: "yoga_shiva_squat", name: "Shiva Squat", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 3, tags: ["standing", "strength"] },
{ id: "yoga_extended_side_angle_utthita_parshvakonasana", name: "Extended Side Angle - utthita parshvakonasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing"] },
{ id: "yoga_standing_splits_urdhva_prasarita_eka_padasana", name: "Standing Splits - urdhva prasarita eka padasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "balance"] },
{ id: "yoga_standing_bow_dandayamana_dhanurasana", name: "Standing Bow - dandayamana dhanurasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "balance"] },
{ id: "yoga_star_utthita_tadasana", name: "Star - utthita tadasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 1, tags: ["standing"] },
{ id: "yoga_tree_vrikshasana", name: "Tree - vrikshasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 2, tags: ["standing", "balance"] },
{ id: "yoga_triangle_trikonasana", name: "Triangle - trikonasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "forward_fold"] },
{ id: "yoga_revolved_triangle_parivritta_trikonasana", name: "Revolved Triangle - parivritta trikonasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "twist", "forward_fold"] },
{ id: "yoga_warrior_i_virabhadrasana_a", name: "Warrior I - virabhadrasana a", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 3, tags: ["standing", "lunge"] },
{ id: "yoga_warrior_ii_virabhadrasana_b", name: "Warrior II - virabhadrasana b", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 3, tags: ["standing", "lunge"] },
{ id: "yoga_warrior_iii_virabhadrasana_c", name: "Warrior III - virabhadrasana c", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["standing"], statesOut: ["standing", "support"], weight: 3, intensity: 3, tags: ["standing", "lunge", "balance"] },
{ id: "yoga_wide_legged_forward_bend_i_prasarita_padottanasana_a", name: "Wide Legged Forward Bend I - prasarita padottanasana a", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "forward_fold"] },
{ id: "yoga_wide_legged_forward_bend_ii_prasarita_padottanasana_b", name: "Wide Legged Forward Bend II - prasarita padottanasana b", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "forward_fold"] },
{ id: "yoga_wide_legged_forward_bend_iii_prasarita_padottanasana_c", name: "Wide Legged Forward Bend III - prasarita padottanasana c", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "forward_fold"] },
{ id: "yoga_wide_legged_forward_bend_iv_prasarita_padottanasana_d", name: "Wide Legged Forward Bend IV - prasarita padottanasana d", enabled: true, equipment: "yoga", level: "simple", statesIn: ["standing"], statesOut: ["standing", "support", "seated"], weight: 3, intensity: 2, tags: ["standing", "forward_fold"] },

// SEATED
{ id: "yoga_archer_s_akarna_dhanurasana", name: "Archer's - akarna dhanurasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_boat_navasana", name: "Boat - navasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 3, tags: ["seated", "core"] },
{ id: "yoga_bound_angle_baddha_konasana", name: "Bound Angle - baddha konasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "bind"] },
{ id: "yoga_butterfly", name: "Butterfly", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_caterpillar", name: "Caterpillar", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_cow_face_gomukhasana", name: "Cow Face - gomukhasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_deer", name: "Deer", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_eight_angle_astavakrasana", name: "Eight Angle - astavakrasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_heron_krounchasana", name: "Heron - krounchasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_half_lord_of_the_fishes_ardha_matsyendrasana", name: "Half Lord of the Fishes - ardha matsyendrasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_half_lotus_ardha_padmasana", name: "Half Lotus - ardha padmasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "lotus"] },
{ id: "yoga_half_pigeon_eka_pada_rajakapotasana", name: "Half Pigeon - eka pada rajakapotasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "hip_opener"] },
{ id: "yoga_heart_to_knee_janu_shirsasana", name: "Heart to Knee - janu shirsasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_lotus_padmasana", name: "Lotus - padmasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "lotus"] },
{ id: "yoga_marichi_a_marichyasana_i", name: "Marichi A - marichyasana I", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_marichi_b_marichyasana_ii", name: "Marichi B - marichyasana II", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_marichi_c_marichyasana_iii", name: "Marichi C - marichyasana III", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_monkey_footed_lotus_eka_pada_padmasana", name: "Monkey Footed Lotus - eka pada padmasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "lotus"] },
{ id: "yoga_open_leg_rocker_ubha_padangusthasana", name: "Open Leg Rocker - ubha padangusthasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_open_legged_forward_fold_upavistha_konasana", name: "Open Legged Forward Fold - upavistha konasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "forward_fold"] },
{ id: "yoga_pigeon", name: "Pigeon", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "hip_opener"] },
{ id: "yoga_rabbit_shashankasana", name: "Rabbit - shashankasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_reverse_tabletop_ardha_purvottanasana", name: "Reverse Tabletop - ardha purvottanasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_seated_cow_face_gomukhasana", name: "Seated Cow Face - gomukhasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_seated_forward_fold_paschimottanasana", name: "Seated Forward Fold - paschimottanasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "forward_fold"] },
{ id: "yoga_seated_hero_virasana", name: "Seated Hero - virasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_seated_side_stretch_parighasana", name: "Seated Side Stretch - parighasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_seated_spinal_twist", name: "Seated Spinal Twist", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "twist"] },
{ id: "yoga_shoelace", name: "Shoelace", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_staff_dandasana", name: "Staff - dandasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_sugarcane_ardha_chandrasana_chapasana", name: "Sugarcane - ardha chandrasana chapasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_tortoise_kurmasana", name: "Tortoise - kurmasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 3, tags: ["seated"] },
{ id: "yoga_upward_plank_purvottanasana", name: "Upward Plank - purvottanasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_wide_legged_seated_forward_fold_upavistha_konasana", name: "Wide-Legged Seated Forward Fold - upavistha konasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "forward_fold"] },
{ id: "yoga_wheel_at_the_wall", name: "Wheel at the Wall", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_wise_man_men_s_perspective", name: "Wise Man (Men's Perspective)", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_wise_man_women_s_perspective", name: "Wise Man (Women's Perspective)", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_yogi_squat_malasana", name: "Yogi Squat - malasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_zigzag", name: "ZigZag", enabled: true, equipment: "yoga", level: "simple", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_compass_parivrtta_surya_yantrasana", name: "Compass - parivrtta surya yantrasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 3, tags: ["seated"] },
{ id: "yoga_fire_log_agni_stambhasana", name: "Fire Log - agni stambhasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated"] },
{ id: "yoga_revolved_seated_pigeon_parivrtta_kapotasana", name: "Revolved Seated Pigeon - parivrtta kapotasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["seated"], statesOut: ["seated", "supine", "standing"], weight: 3, intensity: 2, tags: ["seated", "twist", "hip_opener"] },

//SUPINE

{ id: "yoga_banana_supta_nitambasana", name: "Banana - supta nitambasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 1, tags: ["supine"] },
{ id: "yoga_bridge_setu_bandha_sarvangasana", name: "Bridge - setu bandha sarvangasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 3, tags: ["supine", "backbend"] },
{ id: "yoga_corpse_shavasana", name: "Corpse - shavasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 1, intensity: 1, tags: ["supine", "cooldown"] },
{ id: "yoga_fish_matsyasana", name: "Fish - matsyasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 2, tags: ["supine", "backbend"] },
{ id: "yoga_supine_foot_to_head_supta_trivikramasana", name: "Supine Foot to Head - supta trivikramasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 2, intensity: 4, tags: ["supine"] },
{ id: "yoga_extended_supine_hand_to_big_toe_supta_padangushthasana_b", name: "Extended Supine Hand to Big Toe - supta padangushthasana b", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 1, tags: ["supine"] },
{ id: "yoga_supine_hand_to_big_toe_supta_padangushthasana_a", name: "Supine Hand to Big Toe - supta padangushthasana a", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 1, tags: ["supine"] },
{ id: "yoga_happy_baby_ananda_balasana", name: "Happy Baby - ananda balasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 1, tags: ["supine", "hip_opener"] },
{ id: "yoga_sleeping_yogi_yoga_nidrasana", name: "Sleeping Yogi - yoga nidrasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 1, intensity: 1, tags: ["supine", "cooldown"] },
{ id: "yoga_supine_spinal_twist_supta_matsyendrasana", name: "Supine Spinal Twist - supta matsyendrasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 2, tags: ["supine", "twist"] },
{ id: "yoga_supine_straddle_supta_samakonasana", name: "Supine Straddle - supta samakonasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 2, tags: ["supine"] },
{ id: "yoga_waterfall_supta_dandasana", name: "Waterfall - supta dandasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 2, tags: ["supine"] },
{ id: "yoga_wind_removing_pavanamuktasana", name: "Wind Removing - pavanamuktasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 1, tags: ["supine", "core"] },

// PRONE
{ id: "yoga_bow_dhanurasana", name: "Bow - dhanurasana", enabled: true, equipment: "yoga", level: "moyen",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 3, tags: ["prone", "backbend"] },

{ id: "yoga_half_bow_ardha_dhanurasana", name: "Half Bow - ardha dhanurasana", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 3, tags: ["prone", "backbend"] },

{ id: "yoga_childs_balasana", name: "Child's - balasana", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "seated", "support"], weight: 3, intensity: 1, tags: ["prone", "rest"] },

{ id: "yoga_cobra_bhujangasana", name: "Cobra - bhujangasana", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 2, tags: ["prone", "backbend"] },

{ id: "yoga_reverse_corpse_advasana", name: "Reverse Corpse - advasana", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "seated", "support"], weight: 3, intensity: 1, tags: ["prone", "rest"] },

{ id: "yoga_extended_puppy_uttana_shishosana", name: "Extended Puppy - uttana shishosana", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 1, tags: ["prone", "shoulders", "stretch"] },

{ id: "yoga_frog_bhekasana", name: "Frog - bhekasana", enabled: true, equipment: "yoga", level: "moyen",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 3, tags: ["prone", "backbend"] },

{ id: "yoga_locust_i_shalabhasana_a", name: "Locust I - shalabhasana a", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 3, tags: ["prone", "back_strength"] },

{ id: "yoga_locust_ii_shalabhasana_b", name: "Locust II - shalabhasana b", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 3, tags: ["prone", "back_strength"] },

{ id: "yoga_locust_iii_shalabhasana_c", name: "Locust III - shalabhasana c", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 3, tags: ["prone", "back_strength"] },

{ id: "yoga_sage_gherandas_gherandasana", name: "Sage Gheranda's - gherandasana", enabled: true, equipment: "yoga", level: "avance",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 2, intensity: 4, tags: ["prone", "advanced", "backbend"] },

{ id: "yoga_snake_sarpasana", name: "Snake - sarpasana", enabled: true, equipment: "yoga", level: "moyen",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 3, tags: ["prone", "backbend"] },

{ id: "yoga_sphinx_salamba_bhujangasana", name: "Sphinx - salamba bhujangasana", enabled: true, equipment: "yoga", level: "simple",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 2, tags: ["prone", "backbend"] },

{ id: "yoga_tortoise_kurmasana", name: "Tortoise - kurmasana", enabled: true, equipment: "yoga", level: "moyen",
  statesIn: ["prone"], statesOut: ["prone", "support", "seated"], weight: 3, intensity: 3, tags: ["prone", "hip_opener"] },

// Arm & Leg Support
{ id: "yoga_box_chakravakasana", name: "Box - chakravakasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "prone", "seated"], weight: 3, intensity: 2, tags: ["support", "warmup", "spine"] },
{ id: "yoga_camel_ushtrasana", name: "Camel - ushtrasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "prone", "supine"], weight: 3, intensity: 3, tags: ["support", "backbend"] },
{ id: "yoga_cat_marjariasana", name: "Cat - marjariasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "prone", "seated"], weight: 3, intensity: 1, tags: ["support", "warmup", "spine"] },
{ id: "yoga_cow_bitilasana", name: "Cow - bitilasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "prone", "seated"], weight: 3, intensity: 1, tags: ["support", "warmup", "spine"] },
{ id: "yoga_dolphin_shishumarasana", name: "Dolphin - shishumarasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "standing", "prone"], weight: 3, intensity: 3, tags: ["support", "shoulders"] },
{ id: "yoga_downward_facing_dog_adho_mukha_shvanasana", name: "Downward-Facing Dog - adho mukha shvanasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "standing", "prone"], weight: 3, intensity: 2, tags: ["support"] },
{ id: "yoga_eight_point_ashtangasana", name: "Eight Point - ashtangasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "prone"], weight: 3, intensity: 2, tags: ["support", "strength"] },
{ id: "yoga_humble_flamingo", name: "Humble Flamingo", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support"], statesOut: ["support", "standing", "seated"], weight: 2, intensity: 4, tags: ["support", "hip_opener"] },
{ id: "yoga_gate_parighasana", name: "Gate - parighasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "standing", "seated"], weight: 3, intensity: 3, tags: ["support", "hip_opener"] },
{ id: "yoga_horse_vatayanasana", name: "Horse - vatayanasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support"], statesOut: ["support", "standing", "seated"], weight: 2, intensity: 4, tags: ["support", "hip_opener"] },
{ id: "yoga_lizard_uttana_pristhasana", name: "Lizard - uttana pristhasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "standing", "seated"], weight: 3, intensity: 3, tags: ["support", "hip_opener"] },
{ id: "yoga_lunge", name: "Lunge", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "standing", "seated"], weight: 3, intensity: 2, tags: ["support", "hip_opener"] },
{ id: "yoga_crooked_monkey", name: "Crooked Monkey", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "standing", "seated"], weight: 3, intensity: 2, tags: ["support", "hip_opener"] },
{ id: "yoga_pigeon_kapotasana", name: "Pigeon - kapotasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "standing", "seated"], weight: 3, intensity: 3, tags: ["support", "hip_opener"] },
{ id: "yoga_plank_phalakasana", name: "Plank - phalakasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "prone"], weight: 3, intensity: 2, tags: ["support", "core"] },
{ id: "yoga_upward_plank_purvottanasana", name: "Upward Plank - purvottanasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "standing", "prone", "seated"], weight: 3, intensity: 2, tags: ["support", "core"] },
{ id: "yoga_low_push_up_chaturanga_dandasana", name: "Low Push-up - chaturanga dandasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "prone"], weight: 3, intensity: 3, tags: ["support", "strength"] },
{ id: "yoga_rabbit_shashankasana", name: "Rabbit - shashankasana", enabled: true, equipment: "yoga", level: "simple", statesIn: ["support"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 2, tags: ["support", "forward_fold"] },
{ id: "yoga_sage_visvamitra_s_vishvamitrasana", name: "Sage Visvamitra's - vishvamitrasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support"], statesOut: ["support", "standing", "prone", "seated"], weight: 2, intensity: 4, tags: ["support", "hip_opener"] },
{ id: "yoga_side_plank_vasishthasana", name: "Side Plank - vasishthasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "prone"], weight: 3, intensity: 3, tags: ["support", "core"] },
{ id: "yoga_inverted_staff_dvi_pada_viparita_dandasana", name: "Inverted Staff - dvi pada viparita dandasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support"], statesOut: ["support", "prone", "supine"], weight: 2, intensity: 4, tags: ["support", "backbend"] },
{ id: "yoga_little_thunderbolt_laghu_vajrasana", name: "Little Thunderbolt - laghu vajrasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support"], statesOut: ["support", "prone", "supine"], weight: 2, intensity: 4, tags: ["support", "backbend"] },
{ id: "yoga_tiger_vyaghrasana", name: "Tiger - vyaghrasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "prone", "seated"], weight: 3, intensity: 3, tags: ["support"] },
{ id: "yoga_upward_facing_dog_urdhva_mukha_shvanasana", name: "Upward-Facing Dog - urdhva mukha shvanasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support"], statesOut: ["support", "prone", "supine"], weight: 3, intensity: 3, tags: ["support", "backbend"] },
{ id: "yoga_wheel_urdhva_dhanurasana", name: "Wheel - urdhva dhanurasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support"], statesOut: ["support", "prone", "supine"], weight: 2, intensity: 4, tags: ["support", "backbend"] },
{ id: "yoga_wild_thing_chamatkarasana", name: "Wild Thing - chamatkarasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support"], statesOut: ["support", "prone", "supine"], weight: 2, intensity: 4, tags: ["support", "backbend"] },

// Arm Balance & Inversion
{ id: "yoga_chin_stand_ganda_bherundasana", name: "Chin Stand - ganda bherundasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_crane_bakasana", name: "Crane - bakasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_crow_kakasana", name: "Crow - kakasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_deaf_mans_karna_pidasana", name: "Deaf Man's - karna pidasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 3, tags: ["inversion", "supine"] },
{ id: "yoga_eight_angle_ashtavakrasana", name: "Eight Angle - ashtavakrasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_elbow_balance_shayanasana", name: "Elbow Balance - shayanasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_elephant_trunk_eka_hasta_bhujasana", name: "Elephant Trunk - eka hasta bhujasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_embryo_pindasana", name: "Embryo - pindasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 3, tags: ["inversion", "supine"] },
{ id: "yoga_firefly_i_tittibhasana_a", name: "Firefly I - tittibhasana a", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_floating_stick_brahmacharyasana", name: "Floating Stick - brahmacharyasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_flying_man_eka_pada_koundinyasana", name: "Flying Man - eka pada koundinyasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_revolved_flying_man_parivritta_eka_pada_koundinyasana", name: "Revolved Flying Man - parivritta eka pada koundinyasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_forearm_balance_pincha_mayurasana", name: "Forearm Balance - pincha mayurasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_grasshopper_maksikanagasana", name: "Grasshopper - maksikanagasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_handstand_adho_mukha_vrikshasana", name: "Handstand - adho mukha vrikshasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_supported_headstand_salamba_shirshasana_a", name: "Supported Headstand - salamba shirshasana a", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_tripod_headstand_mukta_hasta_shirshasana_a", name: "Tripod Headstand - mukta hasta shirshasana a", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_himalayan_duck_karandavasana", name: "Himalayan Duck - karandavasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_flying_lizard", name: "Flying Lizard", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_moon_bird_eka_pada_shirshasana_c", name: "Moon Bird - eka pada shirshasana c", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_peacock_mayurasana", name: "Peacock - mayurasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_pendant_lolasana", name: "Pendant - lolasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_flying_pigeon_eka_pada_galavasana", name: "Flying Pigeon - eka pada galavasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_plow_halasana", name: "Plow - halasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 3, tags: ["inversion", "supine"] },
{ id: "yoga_rooster_kukkutasana", name: "Rooster - kukkutasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_scale_tolasana", name: "Scale - tolasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_scorpion_vrischikasana_a", name: "Scorpion - vrischikasana a", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "standing"], statesOut: ["support", "standing", "supine"], weight: 2, intensity: 4, tags: ["inversion", "arm_balance"] },
{ id: "yoga_shoulder_pressing_bhuja_pidasana", name: "Shoulder Pressing - bhuja pidasana", enabled: true, equipment: "yoga", level: "avance", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 2, intensity: 3, tags: ["arm_balance"] },
{ id: "yoga_shoulder_stand_with_lotus_legs_urdhva_padmasana", name: "Shoulder Stand with Lotus Legs - urdhva padmasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 3, tags: ["inversion", "supine"] },
{ id: "yoga_supported_shoulder_stand_salamba_sarvangasana", name: "Supported Shoulder Stand - salamba sarvangasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 3, tags: ["inversion", "supine"] },
{ id: "yoga_supine_angle_supta_konasana", name: "Supine Angle - supta konasana", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["supine"], statesOut: ["supine", "seated"], weight: 3, intensity: 3, tags: ["inversion", "supine"] },
{ id: "yoga_two_legs_behind_the_head_ii_dvi_pada_shirshasana_b", name: "Two Legs Behind the Head II - dvi pada shirshasana b", enabled: true, equipment: "yoga", level: "moyen", statesIn: ["support", "seated"], statesOut: ["support", "seated", "standing"], weight: 3, intensity: 3, tags: ["arm_balance"] },


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
 * 2) PRESETS (modèles) — localStorage
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
 *  3) RÉFÉRENCES UI (DOM)
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
*  4) ÉTAT RUNTIME (session)
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
let yogaState = "standing"; // état courant pour transitions yoga


let beepLast = DEFAULTS.beepLast;
let lastBeepSecond = null;

let editingPresetId = null;


// Exercices (état de la checklist en mémoire)
let exercisesState = DEFAULT_EXERCISES.map(x => ({ ...x }));
let nextExercise = "—";


/***********************
 *  5) UTILITAIRES GÉNÉRAUX
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
 *  6) MODIFICATEURS (pondération)
 ************************/

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
function pickWeightedExercise(list) {
  const items = list
    .map(e => ({ ex: e, w: Math.max(0, Number(e.weight) || 0) }))
    .filter(x => x.w > 0);

  if (!items.length) {
    // fallback random uniforme si aucun weight
    return list[Math.floor(Math.random() * list.length)] || null;
  }

  const total = items.reduce((a,x) => a + x.w, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.ex;
  }
  return items[items.length - 1].ex;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)] || null;
}

function pickYogaExercise() {
  const enabled = enabledExercises().filter(e => e.equipment === "yoga");
  if (!enabled.length) return null;

  // candidats compatibles
  const candidates = enabled.filter(e => Array.isArray(e.statesIn) && e.statesIn.includes(yogaState));

  const chosen = candidates.length ? pickWeightedExercise(candidates) : pickWeightedExercise(enabled);
  if (!chosen) return null;

  // avancer l’état yoga (choisir une sortie au hasard)
  if (Array.isArray(chosen.statesOut) && chosen.statesOut.length) {
    yogaState = randomPick(chosen.statesOut) || yogaState;
  }

  return chosen;
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

/***********************
 *  7) RÉPÉTITION G/D (exercices)
 ************************/
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
 *  8) UI HELPERS (navigation)
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
 *  9) CHECKLIST EXERCICES (réglages)
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
  if (v === "BJJ_solo") return "Drill solo BJJ";
  if (v === "aucun") return "Sans équipement";
  if (v === "yoga") return "Yoga";
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
  // IMPORTANT: on suit le type de séance choisi
  const sessionEq = el.sessionEquipment ? el.sessionEquipment.value : "none";

  // Si une séance d'équipement est choisie, on force la liste sur cet équipement
  // (l’utilisateur ne voit pas les autres catégories)
  const eq = (sessionEq && sessionEq !== "none")
    ? sessionEq
    : (el.filterEquipment ? el.filterEquipment.value : "all");

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
  const equipmentOrder = ["aucun", "corde", "punching_bag", "sol", "BJJ_solo", "yoga"];
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
  const eq = el.sessionEquipment ? el.sessionEquipment.value : "none";
  const list = enabledExercises();
  if (!list.length) return null;

  // Yoga: tirage compatible + pondéré
  if (eq === "yoga") {
    return pickYogaExercise();
  }

  // Autres équipements: inchangé
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}



/***********************
 * 10) AUDIO (MP3)
 ************************/

let beepAudio = null;
let beepLongAudio = null;

function initAudio() {
  if (!beepAudio) {
    beepAudio = new Audio("./beep.mp3");
    beepAudio.preload = "auto";
    beepAudio.loop = false;
  }

  if (!beepLongAudio) {
    beepLongAudio = new Audio("./beep_long.mp3");
    beepLongAudio.preload = "auto";
    beepLongAudio.loop = false;

    // Reset à la fin du long beep
    beepLongAudio.addEventListener("ended", () => {
      beepLongAudio.currentTime = 0;
      // optionnel: remettre un volume "par défaut"
      beepLongAudio.volume = 1.0;
    });
  }



  if (!beepLongAudio) {
    beepLongAudio = new Audio("./beep_long.mp3");
    beepLongAudio.preload = "auto";
    beepLongAudio.loop = false; 
  }
}
function playBeep(volume = 1) {
  if (!beepAudio) return;

  // Empêche le chevauchement
  if (beepLongAudio) {
    beepLongAudio.pause();
    beepLongAudio.currentTime = 0;
  }

  beepAudio.pause();            // (au cas où)
  beepAudio.currentTime = 0;
  beepAudio.volume = volume;
  beepAudio.play().catch(() => {});
}

function playBeepLong(volume = 1) {
  if (!beepLongAudio) return;

  // Empêche le chevauchement
  if (beepAudio) {
    beepAudio.pause();
    beepAudio.currentTime = 0;
  }

  beepLongAudio.pause();        // (au cas où)
  beepLongAudio.currentTime = 0;
  beepLongAudio.volume = volume;
  beepLongAudio.play().catch(() => {});
}

function stopAudio() {
  if (beepAudio) {
    beepAudio.pause();
    beepAudio.currentTime = 0;
  }
  if (beepLongAudio) {
    beepLongAudio.pause();
    beepLongAudio.currentTime = 0;
  }
}


/**
 * Bip court et discret.
 * On utilise un oscillateur -> pas besoin de fichiers audio.
 */
function beep({ volume = 1 } = {}) {
  if (!beepAudio) return;

  beepAudio.currentTime = 0;   // permet les bips rapprochés
  beepAudio.volume = volume;
  beepAudio.play().catch(() => {});
}


/***********************
 * 11) WAKE LOCK (anti-veille)
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
 * 12) SETTINGS (localStorage)
 ************************/

function normalizeExercises(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return DEFAULT_EXERCISES.map(x => ({
      ...x,
      repeatThisExercise: !!x.repeatThisExercise
    }));
  }

  return arr
    .map(e => ({
      id: String(e.id ?? uid()),
      key: e.key ? String(e.key) : undefined,              // <- NEW (optionnel mais utile)
      name: String(e.name ?? "").trim(),
      enabled: !!e.enabled,
      equipment: String(e.equipment ?? "aucun"),
      level: String(e.level ?? "simple"),
      repeatThisExercise: !!e.repeatThisExercise,

      // --- NEW: yoga metadata (optionnels) ---
      statesIn: Array.isArray(e.statesIn) ? e.statesIn.map(String) : undefined,
      statesOut: Array.isArray(e.statesOut) ? e.statesOut.map(String) : undefined,
      weight: (e.weight == null ? undefined : Number(e.weight)),
      intensity: (e.intensity == null ? undefined : Number(e.intensity)),
      tags: Array.isArray(e.tags) ? e.tags.map(String) : undefined
    }))
    .filter(e => e.name.length > 0);
}
function mergeDefaultExercises(savedList) {
  const saved = Array.isArray(savedList) ? savedList : [];

  // Index des exercices sauvegardés (par id stable)
  const savedById = new Map(saved.map(e => [String(e.id), e]));

  // Set des ids du code (defaults)
  const defaultIds = new Set(DEFAULT_EXERCISES.map(d => String(d.id)));

  // 1) Base: defaults, mais on conserve les préférences user si existantes.
  //    Si l'exercice est nouveau (pas dans saved), on le met enabled:false.
  const merged = DEFAULT_EXERCISES.map(def => {
    const id = String(def.id);
    const s = savedById.get(id);

    if (!s) {
      // Exercice nouvellement ajouté dans le code
      return {
        ...def,
        enabled: false,                      // <- IMPORTANT: pas coché par défaut
        repeatThisExercise: false            // <- optionnel: safe default
      };
    }

    // Exercice déjà connu: garder les choix utilisateur
    return {
      ...def,                               // prend les nouveautés du code (ex: tags, statesIn/out)
      enabled: !!s.enabled,
      repeatThisExercise: !!s.repeatThisExercise
    };
  });

  // 2) Ajouter les exercices custom user (ceux qui n'existent pas dans defaults)
  for (const e of saved) {
    const id = String(e.id);
    if (!defaultIds.has(id)) merged.push(e);
  }

  return merged;
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

      exercises: mergeDefaultExercises(normalizeExercises(obj.exercises)),


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

  const repeatModeEnabled = el.repeatModeEnabled ? !!el.repeatModeEnabled.checked : false;
  const repeatScope = el.repeatScope ? String(el.repeatScope.value || "all") : "all";

  // Toujours Gauche/Droite (comme tu veux)
  const repeatLabels = ["G", "D"]; // ou ["Gauche","Droite"] si tu préfères l'affichage complet

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

    // Répétition
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
      repeatThisExercise: !!e.repeatThisExercise
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
  // Répétition: remettre l'UI en cohérence avec le preset
if (el.repeatModeEnabled) el.repeatModeEnabled.checked = !!s.repeatModeEnabled;
if (el.repeatScope) el.repeatScope.value = String(s.repeatScope ?? "all");

// Si tu as un select de labels preset, optionnel:
if (el.repeatLabelsPreset) {
  // toi tu veux toujours G/D, donc on force GD
  el.repeatLabelsPreset.value = "GD";
}

applyEquipmentUI({ resetChecks: false });
  renderExerciseChecklist();
}



/***********************
 * 13) LOGIQUE MINUTEUR (moteur)
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
  yogaState = "standing";


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

  stopAudio();
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
    stopAudio();
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
// Bips dernières secondes du travail (ex: 3-2-1)
if (phase === "work" && beepLast > 0 && remaining <= beepLast && remaining > 0) {

  // Anti-boucle: si on est déjà passé par cette seconde, on ne rejoue pas.
  if (lastBeepSecond !== remaining) {
    lastBeepSecond = remaining;

    if (remaining === 1) {
      stopAudio();          // évite overlap si un bip court jouait encore
      playBeepLong(0.6);
    } else {
      playBeep(0.4);
    }
  }
} else {
  // Quand on sort de la fenêtre des bips, on reset l'anti-boucle
  lastBeepSecond = null;
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
  lastBeepSecond = null;
  stopAudio();


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
    initAudio();
    stopAudio();
    playBeep(0.6);
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
  playBeep(0.6);
  setTimeout(() => playBeep(0.6), 180);

  isRunning = true;
  isPaused = true;

  stopAudio();
  releaseWakeLock();

  setButtons({ running: true, paused: true });
}

/***********************
* 14) SERVICE WORKER (MAJ auto)
 ************************/

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
 * 15) INIT / EVENTS
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
  
  el.filterLevel?.addEventListener("change", () => {
  renderExerciseChecklist();
  saveSettings(settingsFromUI());
});

el.filterEquipment?.addEventListener("change", () => {
  renderExerciseChecklist();
  saveSettings(settingsFromUI());
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

  // Pour les répétitions d'exerices simple
  el.repeatModeEnabled?.addEventListener("change", () => {
  saveSettings(settingsFromUI());
  renderExerciseChecklist();   // IMPORTANT: fait apparaître/disparaître ↻
});

el.repeatScope?.addEventListener("change", () => {
  saveSettings(settingsFromUI());
  renderExerciseChecklist();   // IMPORTANT
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

}


// Lancer l'app
init();
