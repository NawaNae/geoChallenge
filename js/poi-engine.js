// ================================================================
// POI ENGINE — Airports & Ports Quiz, Deduplication & Map Markers
// ================================================================
// Strictly zero innerHTML, file:// compatible, MVC separated.

let poiLayerGroup = null;
const poiMarkersById = new Map();

function normalizePoiText(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/台/g, "臺")
    .replace(/[（()）\[\]【】\-_.·・]/g, "");
}

function shouldFilterPoisByRegion() {
  return Boolean(
    state.filterStationsByRegion &&
    state.regionQuizEnabled &&
    state.selectedTownIds &&
    state.selectedTownIds.size > 0
  );
}

function isPoiInSelectedRegion(poi) {
  if (!poi) return false;
  const townId = resolvePoiTownId(poi);
  if (townId && state.selectedTownIds && state.selectedTownIds.has(townId)) {
    return true;
  }
  if (state.selectedCounties && state.selectedCounties.has(poi.countyName)) {
    // Only fallback to county match if townId wasn't resolved
    return !townId;
  }
  return false;
}

function getEnabledSubTypesForCategory(category) {
  if (category === "airport") {
    return state.airportSubTypes && typeof state.airportSubTypes.has === "function" ? state.airportSubTypes : new Set();
  }
  if (category === "port") {
    return state.portSubTypes && typeof state.portSubTypes.has === "function" ? state.portSubTypes : new Set();
  }
  return new Set();
}

function isPoiCategoryActive(category) {
  if (category === "airport") {
    return Boolean(state.airportQuizEnabled && getEnabledSubTypesForCategory("airport").size > 0);
  }
  if (category === "port") {
    return Boolean(state.portQuizEnabled && getEnabledSubTypesForCategory("port").size > 0);
  }
  return false;
}

function hasAnyPoiQuizActive() {
  return isPoiCategoryActive("airport") || isPoiCategoryActive("port");
}

// Counts items matching a single subType (overlapping multi-tag items increment EACH subType by +1)
function countPoisBySubType(category, subTypeId, applyRegionFilter = false) {
  const useRegion = applyRegionFilter && shouldFilterPoisByRegion();
  let count = 0;
  for (const poi of TAIWAN_POI_DATA) {
    if (poi.category !== category) continue;
    if (!poi.subTypes.includes(subTypeId)) continue;
    if (useRegion && !isPoiInSelectedRegion(poi)) continue;
    count++;
  }
  return count;
}

// Counts UNIQUE (deduplicated) items across a Set of subTypes (overlapping items add only +1 to total)
function countUniquePoisForSubTypes(category, subTypeSet, applyRegionFilter = false) {
  if (!subTypeSet || subTypeSet.size === 0) return 0;
  const useRegion = applyRegionFilter && shouldFilterPoisByRegion();
  const seen = new Set();
  for (const poi of TAIWAN_POI_DATA) {
    if (poi.category !== category) continue;
    if (!poi.subTypes.some((st) => subTypeSet.has(st))) continue;
    if (useRegion && !isPoiInSelectedRegion(poi)) continue;
    seen.add(poi.id);
  }
  return seen.size;
}

// Returns deduplicated array of active quiz POIs (optionally filtered to one category)
function getActiveQuizPois(categoryFilter = null) {
  const result = [];
  const seen = new Set();
  const useRegion = shouldFilterPoisByRegion();

  for (const poi of TAIWAN_POI_DATA) {
    if (categoryFilter && poi.category !== categoryFilter) continue;
    if (!isPoiCategoryActive(poi.category)) continue;
    const enabledSubs = getEnabledSubTypesForCategory(poi.category);
    if (!poi.subTypes.some((st) => enabledSubs.has(st))) continue;
    if (useRegion && !isPoiInSelectedRegion(poi)) continue;
    if (seen.has(poi.id)) continue;
    seen.add(poi.id);
    result.push(poi);
  }
  return result;
}

function buildPoiMatchKeys(poi, allowBareStem) {
  const keys = new Set();
  const addKey = (s) => {
    const n = normalizePoiText(s);
    if (n && n.length >= 2) keys.add(n);
  };
  addKey(poi.name);
  addKey(poi.shortName);
  if (poi.code) addKey(poi.code);
  if (Array.isArray(poi.aliases)) {
    poi.aliases.forEach(addKey);
  }

  // Allow bare stems (e.g., "桃園" -> 桃園機場, "基隆" -> 基隆港) ONLY when region quiz is NOT active
  // so typing a county/town name in mixed mode never hijacks administrative region answers.
  if (allowBareStem) {
    const stem = normalizePoiText(poi.shortName)
      .replace(/(國際機場|國內機場|空軍基地|陸軍航空基地|航空基地|航空站|機場|基地)$/g, "")
      .replace(/(液化天然氣接收港|液化天然氣接收站|工業專用港|國際商港|天然氣港|工業港|觀光漁港|漁港|商港|港)$/g, "");
    if (stem && stem.length >= 2) {
      keys.add(stem);
    }
  }
  return keys;
}

function matchSinglePoi(poi, normInput, allowBareStem) {
  const keys = buildPoiMatchKeys(poi, allowBareStem);
  return keys.has(normInput);
}

// Attempt to match & unlock an active POI from user input.
// Returns { matched: boolean, alreadyUnlocked?: boolean, poi?: object, wrongTarget?: boolean }
function tryMatchAndUnlockPoi(rawInput, isAutoCheck = false) {
  const activePois = getActiveQuizPois();
  if (activePois.length === 0) return { matched: false };

  const normInput = normalizePoiText(rawInput);
  if (!normInput || normInput.length < 2) return { matched: false };

  const allowBareStem = !state.regionQuizEnabled;

  // Target mode: check ONLY the currently targeted POI first
  if ((state.playMode === "target_random" || state.playMode === "target_click") && state.targetPoiId) {
    const targetPoi = TAIWAN_POI_BY_ID.get(state.targetPoiId);
    if (targetPoi && activePois.some((p) => p.id === targetPoi.id)) {
      if (matchSinglePoi(targetPoi, normInput, true)) {
        if (state.unlockedPois.has(targetPoi.id)) {
          return { matched: true, alreadyUnlocked: true, poi: targetPoi };
        }
        state.unlockedPois.add(targetPoi.id);
        state.missedPois.delete(targetPoi.id);
        return { matched: true, alreadyUnlocked: false, poi: targetPoi };
      }
      return { matched: false, wrongTarget: true };
    }
  }

  // Free recall mode (or no POI target locked)
  const candidates = activePois.filter((p) => matchSinglePoi(p, normInput, allowBareStem));
  if (candidates.length === 0) return { matched: false };

  const unlockedNew = [];
  let alreadyCount = 0;
  for (const poi of candidates) {
    if (state.unlockedPois.has(poi.id)) {
      alreadyCount++;
    } else {
      state.unlockedPois.add(poi.id);
      state.missedPois.delete(poi.id);
      unlockedNew.push(poi);
    }
  }

  if (unlockedNew.length > 0) {
    return { matched: true, alreadyUnlocked: false, poi: unlockedNew[0], unlockedList: unlockedNew };
  }
  if (alreadyCount > 0) {
    return { matched: true, alreadyUnlocked: true, poi: candidates[0] };
  }
  return { matched: false };
}

function getPoiSubTypeLabelList(poi) {
  return poi.subTypes
    .map((st) => {
      const meta = getPoiSubTypeMeta(poi.category, st);
      return meta ? meta.shortLabel : st;
    })
    .join(" / ");
}

function createPoiPinElement(poi, status) {
  const wrap = document.createElement("div");
  wrap.className = `tw-poi-pin tw-poi-${poi.category} tw-poi-state-${status}`;

  const glyph = document.createElement("span");
  glyph.className = "tw-poi-glyph";
  glyph.textContent = poi.category === "airport" ? "✈" : "⚓";
  wrap.appendChild(glyph);

  if (status === "unlocked" || status === "missed") {
    const lbl = document.createElement("span");
    lbl.className = "tw-poi-tag";
    lbl.textContent = poi.shortName;
    wrap.appendChild(lbl);
  }
  return wrap;
}

function initPoiMapEngine() {
  if (typeof map === "undefined" || !map || typeof L === "undefined") return;
  if (!map.getPane("poiMarkerPane")) {
    const p = map.createPane("poiMarkerPane");
    p.style.zIndex = "465";
  }
  if (!poiLayerGroup) {
    poiLayerGroup = L.layerGroup().addTo(map);
  }
  refreshPoiMapLayer();
}

function refreshPoiMapLayer() {
  if (!poiLayerGroup || typeof L === "undefined") return;
  poiLayerGroup.clearLayers();
  poiMarkersById.clear();

  const activePois = getActiveQuizPois();
  if (activePois.length === 0) return;

  const viewState = typeof getActiveViewState === "function" ? getActiveViewState() : state;
  const unlockedSet = viewState.unlockedPois || state.unlockedPois;
  const missedSet = viewState.missedPois || state.missedPois;
  const activeTargetId = viewState.targetPoiId !== undefined ? viewState.targetPoiId : state.targetPoiId;

  for (const poi of activePois) {
    let status = "locked";
    if (unlockedSet && unlockedSet.has(poi.id)) {
      status = "unlocked";
    } else if (missedSet && missedSet.has(poi.id)) {
      status = "missed";
    } else if (activeTargetId === poi.id && (state.playMode === "target_random" || state.playMode === "target_click")) {
      status = "target";
    }

    const pinEl = createPoiPinElement(poi, status);
    const icon = L.divIcon({
      className: "tw-poi-icon-host",
      html: pinEl,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([poi.lat, poi.lng], {
      pane: "poiMarkerPane",
      icon: icon,
      keyboard: false,
      riseOnHover: true
    });

    marker.on("click", (e) => {
      if (e && e.originalEvent) e.originalEvent.stopPropagation();
      handlePoiMarkerClick(poi);
    });

    marker.addTo(poiLayerGroup);
    poiMarkersById.set(poi.id, marker);
  }
}

function handlePoiMarkerClick(poi) {
  if (!poi) return;
  const viewState = typeof getActiveViewState === "function" ? getActiveViewState() : state;
  const unlockedSet = viewState.unlockedPois || state.unlockedPois;
  const catMeta = POI_CATEGORY_META[poi.category] || { icon: "📍", label: "地標" };

  if (state.role === "spectator" || state.isGameOver) {
    if (typeof setFeedback === "function") {
      const subTxt = getPoiSubTypeLabelList(poi);
      setFeedback(`${catMeta.icon} ${poi.name}（${poi.countyName}${poi.townName} · ${subTxt}）`, "info");
    }
    return;
  }

  if (state.playMode === "target_click") {
    if (unlockedSet && unlockedSet.has(poi.id)) {
      if (typeof setFeedback === "function") {
        setFeedback(`✅ 已解鎖：${poi.name}（${getPoiSubTypeLabelList(poi)}）`, "success");
      }
      return;
    }
    state.targetId = null;
    state.targetStationKey = null;
    state.targetPoiId = poi.id;
    state.hintLevel = 0;
    state.lastTargetLat = poi.lat;
    state.lastTargetLng = poi.lng;
    if (typeof refreshAllPolygonStyles === "function") refreshAllPolygonStyles();
    if (typeof updateTransportVisualStyles === "function") updateTransportVisualStyles();
    refreshPoiMapLayer();
    if (typeof updateTargetBannerUI === "function") updateTargetBannerUI();
    if (typeof focusMapOnLatLng === "function") focusMapOnLatLng(poi.lat, poi.lng, 10);
    const inp = document.getElementById("guess-input");
    if (inp) inp.focus();
    return;
  }

  // Free recall or target_random: show non-spoiler info
  if (typeof setFeedback === "function") {
    if (unlockedSet && unlockedSet.has(poi.id)) {
      setFeedback(`${catMeta.icon} ${poi.name}（${poi.countyName}${poi.townName} · ${getPoiSubTypeLabelList(poi)}）`, "info");
    } else {
      const subTxt = getPoiSubTypeLabelList(poi);
      setFeedback(`${catMeta.icon} 尚未解鎖的${catMeta.label}（分類：${subTxt}）`, "info");
    }
  }
}

function getConcisePoiSummaryParts() {
  const parts = [];
  if (isPoiCategoryActive("airport")) {
    const labels = AIRPORT_SUBTYPES.filter((s) => state.airportSubTypes.has(s.id)).map((s) => s.shortLabel);
    const cnt = getActiveQuizPois("airport").length;
    parts.push(`✈️ 機場(${labels.join("/")} ${cnt}座)`);
  }
  if (isPoiCategoryActive("port")) {
    const labels = PORT_SUBTYPES.filter((s) => state.portSubTypes.has(s.id)).map((s) => s.shortLabel);
    const cnt = getActiveQuizPois("port").length;
    parts.push(`⚓ 港口(${labels.join("/")} ${cnt}座)`);
  }
  return parts;
}
