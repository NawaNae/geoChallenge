"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO_DIR = path.resolve(__dirname, "..");

function createSandbox() {
  const elements = {};
  const makeEl = (id) => ({
    id,
    value: "",
    textContent: "",
    className: "",
    options: [],
    classList: {
      _set: new Set(),
      add(...cls) { cls.forEach((c) => this._set.add(c)); },
      remove(...cls) { cls.forEach((c) => this._set.delete(c)); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._set.has(c)) this._set.delete(c);
          else this._set.add(c);
        } else if (force) this._set.add(c);
        else this._set.delete(c);
      },
      contains(c) { return this._set.has(c); }
    },
    replaceChildren() {},
    appendChild() {},
    focus() {},
    querySelector() { return null; },
    getAttribute() { return ""; },
    offsetWidth: 0
  });

  const getEl = (id) => {
    if (!elements[id]) elements[id] = makeEl(id);
    return elements[id];
  };

  const sandbox = {
    console,
    Math,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    JSON,
    Date,
    Intl,
    parseInt,
    parseFloat,
    isNaN,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    navigator: { userAgent: "node-test", language: "zh-TW", hardwareConcurrency: 4, platform: "Linux" },
    screen: { width: 1920, height: 1080, colorDepth: 24 },
    localStorage: { getItem: () => null, setItem: () => {} },
    document: {
      getElementById: getEl,
      querySelectorAll: () => [],
      createElement: () => makeEl("dyn")
    },
    window: {},
    startTimer: () => {},
    playTone: () => {},
    refreshAllPolygonStyles: () => {},
    updateScoreAndProgressUI: () => {},
    broadcastP2PState: () => {},
    checkVictoryCondition: () => {},
    updateTargetBannerUI: () => {},
    pickNextTargetRegion: () => {},
    updateTransportVisualStyles: () => {},
    updateRoadAndRailwayTileOverlays: () => {},
    focusMapOnLatLng: () => {},
    railTileLayers: [],
    map: null,
    lastFeedback: null
  };

  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const loadFiles = [
    "data/admin-data.js",
    "data/transport-data.js",
    "data/poi-data.js",
    "js/state.js",
    "js/transport-engine.js",
    "js/poi-engine.js",
    "js/game-logic.js"
  ];

  for (const rel of loadFiles) {
    const code = fs.readFileSync(path.join(REPO_DIR, rel), "utf8");
    vm.runInContext(code, sandbox, { filename: rel });
  }

  vm.runInContext(`
    const _origSetFeedback = setFeedback;
    setFeedback = function(text, level) {
      window.lastFeedback = { text, level };
      return _origSetFeedback(text, level);
    };
  `, sandbox);

  return sandbox;
}

const sb = createSandbox();

function resetState(opts = {}) {
  const {
    difficulty = "hard_suffix",
    playMode = "free",
    regionQuizEnabled = true,
    stationQuizEnabled = false,
    airportQuizEnabled = false,
    portQuizEnabled = false,
    reservoirQuizEnabled = false,
    lakeQuizEnabled = false,
    prefix = "",
    suffix = "",
    unlockAllHierarchy = false
  } = opts;

  const qtm = regionQuizEnabled && stationQuizEnabled ? "both" : stationQuizEnabled ? "station" : "region";

  vm.runInContext(`
    state.difficulty = ${JSON.stringify(difficulty)};
    state.playMode = ${JSON.stringify(playMode)};
    state.quizTargetMode = ${JSON.stringify(qtm)};
    state.isGameOver = false;
    state.isImeComposing = false;
    state.timerRunning = true;
    state.elapsedSec = 1;
    state.regionQuizEnabled = ${JSON.stringify(regionQuizEnabled)};
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.map(c => c.name));
    state.selectedTownIds = new Set(ALL_TOWNS.map(t => t.id));
    state.unlockedTowns = new Set();
    state.unlockedCounties = ${unlockAllHierarchy ? "new Set(TAIWAN_ADMIN_DATA.map(c => c.name))" : "new Set()"};
    state.unlockedProvinces = ${unlockAllHierarchy ? 'new Set(["臺灣省", "福建省", ...TAIWAN_ADMIN_DATA.filter(c => c.isSpecial).map(c => c.name)])' : "new Set()"};
    state.stationQuizEnabled = ${JSON.stringify(stationQuizEnabled)};
    state.quizStationLines = ${stationQuizEnabled ? "new Set(TAIWAN_SELECTABLE_LINES.filter(l => !l.isHighway).map(l => l.id))" : "new Set()"};
    state.filterStationsByRegion = false;
    state.unlockedStations = new Set();
    state.airportQuizEnabled = ${JSON.stringify(airportQuizEnabled)};
    state.airportSubTypes = new Set(AIRPORT_SUBTYPES.map(s => s.id));
    state.portQuizEnabled = ${JSON.stringify(portQuizEnabled)};
    state.portSubTypes = new Set(PORT_SUBTYPES.map(s => s.id));
    state.reservoirQuizEnabled = ${JSON.stringify(reservoirQuizEnabled)};
    state.reservoirSubTypes = new Set(RESERVOIR_SUBTYPES.map(s => s.id));
    state.lakeQuizEnabled = ${JSON.stringify(lakeQuizEnabled)};
    state.lakeSubTypes = new Set(LAKE_SUBTYPES.map(s => s.id));
    state.unlockedPois = new Set();
    state.missedPois = new Set();
    state.targetId = null;
    state.targetStationKey = null;
    state.targetPoiId = null;
    document.getElementById("prefix-select").value = ${JSON.stringify(prefix)};
    document.getElementById("suffix-input").value = ${JSON.stringify(suffix)};
    document.getElementById("answer-input").value = "";
    window.lastFeedback = null;
  `, sb);
}

const ALL_TOWNS = vm.runInContext("ALL_TOWNS", sb);
const TAIWAN_POI_DATA = vm.runInContext("TAIWAN_POI_DATA", sb);
const EXACT_PORT_SHORT_NAMES = vm.runInContext("EXACT_PORT_SHORT_NAMES", sb);
const STATION_NAME_ALIASES = vm.runInContext("STATION_NAME_ALIASES", sb);

const failures = [];
let totalChecks = 0;

function check(cond, category, detail) {
  totalChecks++;
  if (!cond) failures.push({ category, detail });
}

const t0 = Date.now();

// =========================================================================
// 1. ALL 368 TOWNS — hard_suffix, hard_full, master_hierarchy, casual (mixed)
// =========================================================================
resetState({
  difficulty: "hard_suffix",
  regionQuizEnabled: true,
  stationQuizEnabled: true,
  airportQuizEnabled: true,
  portQuizEnabled: true,
  reservoirQuizEnabled: true,
  lakeQuizEnabled: true
});
for (const t of ALL_TOWNS) {
  const suffixChar = t.townName.slice(-1);
  // 1a. Quick suffix + baseName
  vm.runInContext(`state.unlockedTowns.delete(${JSON.stringify(t.id)})`, sb);
  sb.document.getElementById("prefix-select").value = "";
  sb.document.getElementById("suffix-input").value = suffixChar;
  const comb = sb.buildCombinedInput("", t.baseName, suffixChar);
  const ok = sb.evaluateGuess(t.baseName, false);
  const unlocked = vm.runInContext(`state.unlockedTowns.has(${JSON.stringify(t.id)})`, sb);
  check(ok && unlocked, "1a.Town+QuickSuffix(hard_suffix)", `${t.fullCountyTown}: combined="${comb}", fb="${sb.lastFeedback?.text}"`);

  // 1b. Direct townName with wrong quick suffix (smart override)
  const wrongSuffix = suffixChar === "區" ? "鄉" : "區";
  vm.runInContext(`state.unlockedTowns.delete(${JSON.stringify(t.id)})`, sb);
  sb.document.getElementById("suffix-input").value = wrongSuffix;
  const ok2 = sb.evaluateGuess(t.townName, false);
  const unlocked2 = vm.runInContext(`state.unlockedTowns.has(${JSON.stringify(t.id)})`, sb);
  check(ok2 && unlocked2, "1b.TownDirect+WrongSuffix(smartOverride)", `${t.fullCountyTown}: suffix="${wrongSuffix}", fb="${sb.lastFeedback?.text}"`);
}

// 1c. hard_full: county prefix + quick suffix + baseName
resetState({
  difficulty: "hard_full",
  regionQuizEnabled: true,
  stationQuizEnabled: true,
  airportQuizEnabled: true,
  portQuizEnabled: true,
  reservoirQuizEnabled: true,
  lakeQuizEnabled: true
});
for (const t of ALL_TOWNS) {
  const suffixChar = t.townName.slice(-1);
  sb.document.getElementById("prefix-select").value = t.countyName;
  sb.document.getElementById("suffix-input").value = suffixChar;
  const ok = sb.evaluateGuess(t.baseName, false);
  const unlocked = vm.runInContext(`state.unlockedTowns.has(${JSON.stringify(t.id)})`, sb);
  check(ok && unlocked, "1c.Town+Prefix+QuickSuffix(hard_full)", `${t.fullCountyTown}: fb="${sb.lastFeedback?.text}"`);
}

// 1d. master_hierarchy: province+county prefix + quick suffix + baseName
resetState({
  difficulty: "master_hierarchy",
  regionQuizEnabled: true,
  stationQuizEnabled: true,
  airportQuizEnabled: true,
  portQuizEnabled: true,
  reservoirQuizEnabled: true,
  lakeQuizEnabled: true,
  unlockAllHierarchy: true
});
for (const t of ALL_TOWNS) {
  const suffixChar = t.townName.slice(-1);
  const hierPrefix = t.isSpecial ? t.countyName : `${t.province}${t.countyName}`;
  sb.document.getElementById("prefix-select").value = hierPrefix;
  sb.document.getElementById("suffix-input").value = suffixChar;
  const ok = sb.evaluateGuess(t.baseName, false);
  const unlocked = vm.runInContext(`state.unlockedTowns.has(${JSON.stringify(t.id)})`, sb);
  check(ok && unlocked, "1d.Town+Prefix+QuickSuffix(master_hierarchy)", `${t.fullHierarchyName}: fb="${sb.lastFeedback?.text}"`);
}

// 1e. hard_suffix negative: bare baseName with empty suffix must NOT unlock town
resetState({ difficulty: "hard_suffix", regionQuizEnabled: true });
for (const t of ALL_TOWNS) {
  sb.document.getElementById("suffix-input").value = "";
  const ok = sb.evaluateGuess(t.baseName, false);
  check(!ok, "1e.TownBareNegative(hard_suffix)", `${t.fullCountyTown}: bare "${t.baseName}" unexpectedly matched`);
}

// 1f. casual: bare baseName unlocks every town
resetState({ difficulty: "casual", regionQuizEnabled: true, stationQuizEnabled: true, airportQuizEnabled: true, portQuizEnabled: true });
for (const t of ALL_TOWNS) {
  vm.runInContext(`state.unlockedTowns.delete(${JSON.stringify(t.id)})`, sb);
  const ok = sb.evaluateGuess(t.baseName, false);
  const unlocked = vm.runInContext(`state.unlockedTowns.has(${JSON.stringify(t.id)})`, sb);
  check(ok && unlocked, "1f.TownBare(casual+mixed)", `${t.fullCountyTown}: fb="${sb.lastFeedback?.text}"`);
}

// =========================================================================
// 2. ALL 561 STATIONS — hard_suffix, hard_full, master_hierarchy, casual, aliases
// =========================================================================
resetState({
  difficulty: "hard_suffix",
  regionQuizEnabled: true,
  stationQuizEnabled: true,
  airportQuizEnabled: true,
  portQuizEnabled: true,
  reservoirQuizEnabled: true,
  lakeQuizEnabled: true
});
const allStations = vm.runInContext("getActiveQuizStations()", sb);
assert.ok(allStations.length > 500, `Expected >500 stations, got ${allStations.length}`);

for (const st of allStations) {
  // 2a. Quick suffix "站" + baseName
  vm.runInContext(`state.unlockedStations.delete(${JSON.stringify(st.key)})`, sb);
  sb.document.getElementById("prefix-select").value = "";
  sb.document.getElementById("suffix-input").value = "站";
  const ok = sb.evaluateGuess(st.baseName, false);
  const unlocked = vm.runInContext(`state.unlockedStations.has(${JSON.stringify(st.key)})`, sb);
  check(ok && unlocked, "2a.Station+QuickSuffix(站)", `${st.displayName}: fb="${sb.lastFeedback?.text}"`);

  // 2b. Direct "baseName+站" while quick suffix="區" is active (smart override)
  vm.runInContext(`state.unlockedStations.delete(${JSON.stringify(st.key)})`, sb);
  sb.document.getElementById("suffix-input").value = "區";
  const direct = st.baseName.endsWith("站") ? st.baseName : `${st.baseName}站`;
  const ok2 = sb.evaluateGuess(direct, false);
  const unlocked2 = vm.runInContext(`state.unlockedStations.has(${JSON.stringify(st.key)})`, sb);
  check(ok2 && unlocked2, "2b.StationDirect+WrongSuffix(區)", `${st.displayName}: fb="${sb.lastFeedback?.text}"`);
}

// 2c. hard_full & master_hierarchy with county prefix + quick suffix "站"
for (const diff of ["hard_full", "master_hierarchy"]) {
  resetState({
    difficulty: diff,
    regionQuizEnabled: true,
    stationQuizEnabled: true,
    airportQuizEnabled: true,
    portQuizEnabled: true,
    reservoirQuizEnabled: true,
    lakeQuizEnabled: true,
    unlockAllHierarchy: true
  });
  for (const st of allStations) {
    vm.runInContext(`state.unlockedStations.delete(${JSON.stringify(st.key)})`, sb);
    sb.document.getElementById("prefix-select").value = diff === "master_hierarchy" ? "臺灣省新竹縣" : "臺北市";
    sb.document.getElementById("suffix-input").value = "站";
    const ok = sb.evaluateGuess(st.baseName, false);
    const unlocked = vm.runInContext(`state.unlockedStations.has(${JSON.stringify(st.key)})`, sb);
    check(ok && unlocked, `2c.Station+Prefix+QuickSuffix(${diff})`, `${st.displayName}: fb="${sb.lastFeedback?.text}"`);
  }
}

// 2d. Station aliases with quick suffix "站" in hard_suffix
resetState({ difficulty: "hard_suffix", regionQuizEnabled: true, stationQuizEnabled: true });
for (const alias of Object.keys(STATION_NAME_ALIASES)) {
  vm.runInContext("state.unlockedStations.clear()", sb);
  sb.document.getElementById("suffix-input").value = "站";
  const ok = sb.evaluateGuess(alias, false);
  check(ok, "2d.StationAlias+QuickSuffix(站)", `alias="${alias}", fb="${sb.lastFeedback?.text}"`);
}

// =========================================================================
// 3. ALL 138 POIS (Airports, Ports, Fishery Ports, Reservoirs, Lakes)
// =========================================================================
resetState({
  difficulty: "hard_suffix",
  regionQuizEnabled: true,
  stationQuizEnabled: true,
  airportQuizEnabled: true,
  portQuizEnabled: true,
  reservoirQuizEnabled: true,
  lakeQuizEnabled: true
});
for (const poi of TAIWAN_POI_DATA) {
  // 3a. Direct shortName (suffix="")
  vm.runInContext(`state.unlockedPois.delete(${JSON.stringify(poi.id)})`, sb);
  sb.document.getElementById("prefix-select").value = "";
  sb.document.getElementById("suffix-input").value = "";
  let ok = sb.evaluateGuess(poi.shortName, false);
  let unlocked = vm.runInContext(`state.unlockedPois.has(${JSON.stringify(poi.id)})`, sb);
  check(ok && unlocked, "3a.PoiDirectShortName(hard_suffix+mixed)", `${poi.id} (${poi.shortName}): fb="${sb.lastFeedback?.text}"`);

  // 3b. Direct shortName with wrong suffix="區" (smart override)
  vm.runInContext(`state.unlockedPois.delete(${JSON.stringify(poi.id)})`, sb);
  sb.document.getElementById("suffix-input").value = "區";
  ok = sb.evaluateGuess(poi.shortName, false);
  unlocked = vm.runInContext(`state.unlockedPois.has(${JSON.stringify(poi.id)})`, sb);
  check(ok && unlocked, "3b.PoiDirect+WrongSuffix(區)", `${poi.id} (${poi.shortName}): fb="${sb.lastFeedback?.text}"`);

  // 3c. Matching quick suffix + stem
  const quickCases = [];
  const cats = poi.categories || [poi.category];
  if (cats.includes("airport")) {
    const stem = poi.shortName.replace(/(國際機場|國內機場|空軍基地|陸軍航空基地|航空基地|航空站|機場|基地)$/g, "");
    if (stem.length >= 2) quickCases.push({ suffix: "機場", core: stem });
  }
  if (cats.includes("port")) {
    if (poi.shortName.endsWith("漁港")) {
      const stem = poi.shortName.slice(0, -2);
      if (stem.length >= 2) {
        quickCases.push({ suffix: "漁港", core: stem });
        // Also test flexible "港" suffix unless `${stem}港` collides with a distinct exact port (e.g. 安平港)
        if (!EXACT_PORT_SHORT_NAMES.has(sb.normalizePoiText(`${stem}港`))) {
          quickCases.push({ suffix: "港", core: stem });
        }
      }
    } else if (poi.shortName.endsWith("港")) {
      const stem = poi.shortName.replace(/(天然氣港|工業港|商港|港)$/g, "");
      if (stem.length >= 2 && (`${stem}港` === poi.shortName || !EXACT_PORT_SHORT_NAMES.has(sb.normalizePoiText(`${stem}港`)))) {
        quickCases.push({ suffix: "港", core: stem });
      }
    }
  }
  if (cats.includes("reservoir") && poi.shortName.endsWith("水庫")) {
    const stem = poi.shortName.slice(0, -2);
    if (stem.length >= 2) quickCases.push({ suffix: "水庫", core: stem });
  }
  if (cats.includes("lake") && poi.shortName.endsWith("湖")) {
    const stem = poi.shortName.slice(0, -1);
    if (stem.length >= 2) quickCases.push({ suffix: "湖", core: stem });
  }

  for (const qc of quickCases) {
    vm.runInContext(`state.unlockedPois.delete(${JSON.stringify(poi.id)})`, sb);
    sb.document.getElementById("suffix-input").value = qc.suffix;
    const comb = sb.buildCombinedInput("", qc.core, qc.suffix);
    ok = sb.evaluateGuess(qc.core, false);
    unlocked = vm.runInContext(`state.unlockedPois.has(${JSON.stringify(poi.id)})`, sb);
    check(ok && unlocked, "3c.Poi+QuickSuffix(hard_suffix+mixed)", `${poi.id} (${poi.shortName}): core="${qc.core}" suffix="${qc.suffix}" -> "${comb}", fb="${sb.lastFeedback?.text}"`);
  }

  // 3d. IATA code with suffix="機場" and suffix="區"
  if (poi.code && /^[A-Za-z]{3,4}$/.test(poi.code)) {
    for (const sfx of ["機場", "區"]) {
      vm.runInContext(`state.unlockedPois.delete(${JSON.stringify(poi.id)})`, sb);
      sb.document.getElementById("suffix-input").value = sfx;
      ok = sb.evaluateGuess(poi.code, false);
      unlocked = vm.runInContext(`state.unlockedPois.has(${JSON.stringify(poi.id)})`, sb);
      check(ok && unlocked, "3d.PoiCode+QuickSuffix", `${poi.id} code="${poi.code}" suffix="${sfx}": fb="${sb.lastFeedback?.text}"`);
    }
  }
}

// =========================================================================
// 4. TARGET CLICK MODE & CROSS-CATEGORY ISOLATION
// =========================================================================
resetState({
  difficulty: "hard_suffix",
  playMode: "target_click",
  regionQuizEnabled: true,
  stationQuizEnabled: true,
  airportQuizEnabled: true,
  portQuizEnabled: true,
  reservoirQuizEnabled: true,
  lakeQuizEnabled: true
});

// 4a. Target town: 內湖區 / 南港區 / 大湖鄉 / 大埤鄉 with quick suffix
for (const [fullName, core, sfx] of [
  ["臺北市內湖區", "內湖", "區"],
  ["臺北市南港區", "南港", "區"],
  ["苗栗縣大湖鄉", "大湖", "鄉"],
  ["雲林縣大埤鄉", "大埤", "鄉"]
]) {
  const tid = ALL_TOWNS.find((x) => x.fullCountyTown === fullName).id;
  vm.runInContext(`state.targetId = ${JSON.stringify(tid)}; state.targetStationKey = null; state.targetPoiId = null;`, sb);
  sb.document.getElementById("suffix-input").value = sfx;
  const ok = sb.evaluateGuess(core, false);
  const unlocked = vm.runInContext(`state.unlockedTowns.has(${JSON.stringify(tid)})`, sb);
  check(ok && unlocked, "4a.TargetTown+QuickSuffix", `${tid}: core="${core}" suffix="${sfx}", fb="${sb.lastFeedback?.text}"`);
}

// 4b. Cross-category isolation: targeting a town must NOT unlock a POI or station
const neihuId = ALL_TOWNS.find((x) => x.fullCountyTown === "臺北市內湖區").id;
vm.runInContext(`state.targetId = ${JSON.stringify(neihuId)}; state.targetStationKey = null; state.targetPoiId = null; state.unlockedTowns.clear(); state.unlockedPois.clear(); state.unlockedStations.clear();`, sb);
sb.document.getElementById("suffix-input").value = "";
const hijackPoi = sb.evaluateGuess("松山機場", false);
const hijackSt = sb.evaluateGuess("板橋站", false);
check(!hijackPoi && vm.runInContext("state.unlockedPois.size === 0", sb), "4b.TargetIsolation(POI)", "Typing 松山機場 while targeting a town should not unlock POI");
check(!hijackSt && vm.runInContext("state.unlockedStations.size === 0", sb), "4b.TargetIsolation(Station)", "Typing 板橋站 while targeting a town should not unlock Station");

// =========================================================================
// 5. 台/臺 NORMALIZATION & QUICK SUFFIX BAR VISIBILITY
// =========================================================================
resetState({
  difficulty: "hard_suffix",
  regionQuizEnabled: true,
  stationQuizEnabled: true,
  airportQuizEnabled: true,
  portQuizEnabled: true,
  reservoirQuizEnabled: true,
  lakeQuizEnabled: true
});
for (const [core, sfx, expected] of [
  ["台西", "鄉", "臺西鄉"],
  ["台東", "市", "臺東市"],
  ["台北", "站", "臺北站"],
  ["台中", "港", "臺中港"],
  ["台南", "機場", "臺南機場"]
]) {
  const comb = sb.buildCombinedInput("", core, sfx);
  check(comb === expected, "5a.TaiNormalization", `${core}+${sfx} -> "${comb}" (expected "${expected}")`);
}

// Quick suffix bar visibility
for (const diff of ["casual", "county_only"]) {
  resetState({ difficulty: diff, regionQuizEnabled: true, stationQuizEnabled: true, portQuizEnabled: true });
  const list = sb.getActiveQuickSuffixes();
  check(list.length === 0, "5b.QuickSuffixHidden", `${diff} should have 0 quick suffixes, got ${JSON.stringify(list)}`);
}
resetState({
  difficulty: "hard_suffix",
  regionQuizEnabled: true,
  stationQuizEnabled: true,
  airportQuizEnabled: true,
  portQuizEnabled: true,
  reservoirQuizEnabled: true,
  lakeQuizEnabled: true
});
const activeSuffixes = sb.getActiveQuickSuffixes();
for (const needed of ["", "區", "鄉", "鎮", "市", "站", "機場", "港", "漁港", "水庫", "湖"]) {
  check(activeSuffixes.includes(needed), "5c.QuickSuffixVisible", `Missing quick suffix "${needed}" in ${JSON.stringify(activeSuffixes)}`);
}

// =========================================================================
// SUMMARY
// =========================================================================
const elapsedMs = Date.now() - t0;
console.log(`Ran ${totalChecks} exhaustive checks in ${elapsedMs}ms (${ALL_TOWNS.length} towns, ${allStations.length} stations, ${TAIWAN_POI_DATA.length} POIs).`);
if (failures.length > 0) {
  const byCat = {};
  for (const f of failures) {
    if (!byCat[f.category]) byCat[f.category] = [];
    byCat[f.category].push(f.detail);
  }
  console.error(`FAILED: ${failures.length} failures.`);
  for (const [cat, list] of Object.entries(byCat)) {
    console.error(`\n[${cat}] (${list.length}):`);
    list.slice(0, 20).forEach((d) => console.error("  - " + d));
  }
  process.exit(1);
}
console.log("ALL EXHAUSTIVE TESTS PASSED!");
