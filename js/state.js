// =========================================================================
// 2. APPLICATION STATE (With Performance & IME Composition Flags)
// =========================================================================
const state = {
  difficulty: "casual",        // 'casual' | 'county_only' | 'hard_full' | 'master_hierarchy'
  playMode: "free",            // 'free' | 'target_random' | 'target_click'
  mapLayer: "vector",          // 'vector' | 'terrain' | 'street' | 'satellite'
  showRailOverlay: false,      // Default OFF
  transportMode: "off",        // 'off' | 'lines_and_stations' | 'stations_only'
  showDistrictBorders: true,   // Toggleable administrative boundaries (區界開關)
  showStationNames: false,     // Hidden by default so station names don't spoil answers
  p2pLayerRule: "free",        // 'free' | 'locked'
  p2pForcedLayer: "vector",
  p2pRailRule: "free",         // 'free' | 'ban_rail' | 'force_lines' | 'force_stations'
  leaderLineMode: "smart",     // 'smart' | 'all_callout' | 'inline_only'
  // Performance & Label Display Settings
  dragSyncMode: "realtime_raf",// 'hide_on_move' (高效能移動時隱藏) | 'realtime_raf' (即時同步跟隨)
  maxVisibleCallouts: 30,      // Max callout labels on screen
  minPolygonPixelSize: 22,     // Hide labels for polygons smaller than this when zoomed out
  perfLiteMode: true,          // Disable heavy CSS blurs by default for 60FPS
  isImeComposing: false,       // Tracks Windows Bopomofo / IME dotted-underline state!
  selectedCounties: new Set(TAIWAN_ADMIN_DATA.map(c => c.name)),
  unlockedTowns: new Set(),
  unlockedCounties: new Set(),
  unlockedProvinces: new Set(),
  missedTowns: new Set(),
  unlockedStations: new Set(),
  missedStations: new Set(),
  targetStationKey: null,
  stationQuizEnabled: false,
  quizTargetMode: "region", // 'region' | 'station' | 'mixed'
  showRawOpenRailwayTile: true,
  useAlgorithmicCleanRailTile: false,
  quizStationLines: new Set(),
  isGameOver: false,
  targetId: null,
  lastTargetLat: 23.75,
  lastTargetLng: 120.95,
  hintLevel: 0,
  timerMode: "up",
  countdownTotalSec: 300,
  elapsedSec: 0,
  timerRunning: false,
  timerInterval: null,
  soundEnabled: true,
  nickname: "台灣地理王",
  roomCode: "",
  peer: null,
  conn: null,
  bcChannel: null,
  opponent: {
    name: "對手",
    score: 0,
    total: 368,
    lastUnlocked: "尚無動態",
    connected: false
  },
  aiRivalTimer: null
};

// Initialize default selected transport lines from data/transport-data.js
state.selectedTransportLines = new Set(TAIWAN_SELECTABLE_LINES.map((l) => l.id));

// =========================================================================
// 3. WEB AUDIO SYNTHESIZER
// =========================================================================
let audioCtx = null;
function playTone(type) {
  if (!state.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "unlock") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "tier") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.15);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    }
  } catch (e) {}
}
