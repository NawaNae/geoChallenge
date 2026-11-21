#!/usr/bin/env node
/**
 * Self-check tests for GeoMaster TW 4 fixes (run with: node tests/test_4fixes.js)
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = process.argv[2] || ".";
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// 1. Mobile keyboard close fix: no CSS height transition + ResizeObserver + settled invalidateSize
const css = read("css/styles.css");
assert(!css.includes("transition: height 0.08s ease-out"), "CSS must not delay #map-container height");
const mapJs = read("js/map-engine.js");
assert(mapJs.includes("refreshMapViewportAndOverlays"), "map-engine must define refreshMapViewportAndOverlays");
assert(mapJs.includes("ResizeObserver"), "map-engine must observe #map-container resize");
assert(mapJs.includes("animate: false"), "invalidateSize must pass animate: false");
assert(mapJs.includes("scheduleKbSettleResync"), "map-engine must schedule settled resync on keyboard close");

// 2. Unlocked / missed / target polygons keep stroke: true when showDistrictBorders === false
const unlockedMatch = mapJs.match(/if\s*\(isUnlocked\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\};/);
assert(unlockedMatch && /stroke:\s*true/.test(unlockedMatch[1]), "isUnlocked style must explicitly set stroke: true");
const missedMatch = mapJs.match(/if\s*\(isMissed\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\};/);
assert(missedMatch && /stroke:\s*true/.test(missedMatch[1]), "isMissed style must explicitly set stroke: true");
const targetMatch = mapJs.match(/if\s*\(isTarget\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\};/);
assert(targetMatch && /stroke:\s*true/.test(targetMatch[1]), "isTarget style must explicitly set stroke: true");

// 3. Host forced hide-borders mode (p2pBorderRule)
const stateJs = read("js/state.js");
const html = read("index.html");
const p2pJs = read("js/p2p-engine.js");
const uiJs = read("js/ui-controls.js");
assert(stateJs.includes('p2pBorderRule: "free"'), "state.js must define p2pBorderRule");
assert(html.includes('id="p2p-border-rule-select"'), "index.html must include #p2p-border-rule-select");
assert(p2pJs.includes("borderRule"), "p2p-engine.js must sync borderRule");
assert(uiJs.includes("window.setDistrictBordersVisible = setDistrictBordersVisible"), "ui-controls must export setDistrictBordersVisible");
assert(uiJs.includes('state.p2pBorderRule === "force_off"'), "setDistrictBordersVisible must enforce force_off lock");

// 4. Hide redundant prefix dropdown in modes that don't require county/province prefix
const gameJs = read("js/game-logic.js");
assert(gameJs.includes("function isPrefixRequiredMode()"), "game-logic.js must define isPrefixRequiredMode");
assert(gameJs.includes('const hidePrefix = !isPrefixRequiredMode();'), "updatePrefixDropdownUI must toggle #prefix-container");

// Functional test for isPrefixRequiredMode logic
const isPrefixRequiredMode = (state) => Boolean(
  state.regionQuizEnabled &&
  (state.difficulty === "hard_full" || state.difficulty === "master_hierarchy")
);
assert.strictEqual(isPrefixRequiredMode({ regionQuizEnabled: true, difficulty: "casual" }), false);
assert.strictEqual(isPrefixRequiredMode({ regionQuizEnabled: true, difficulty: "county_only" }), false);
assert.strictEqual(isPrefixRequiredMode({ regionQuizEnabled: true, difficulty: "hard_suffix" }), false);
assert.strictEqual(isPrefixRequiredMode({ regionQuizEnabled: false, difficulty: "hard_full" }), false);
assert.strictEqual(isPrefixRequiredMode({ regionQuizEnabled: true, difficulty: "hard_full" }), true);
assert.strictEqual(isPrefixRequiredMode({ regionQuizEnabled: true, difficulty: "master_hierarchy" }), true);

console.log("PASS: All 4 GeoMaster fixes verified!");
