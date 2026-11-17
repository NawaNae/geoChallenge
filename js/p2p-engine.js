// ============================================================================
// 10. P2P WEBRTC ENGINE (Multiplayer >2, Spectator View, Session & Vote Sync)
// ============================================================================
function isMultiplayerActive() {
  return Boolean(
    state.roomCode ||
    state.opponent.connected ||
    state.aiRivalTimer ||
    state.aiRivalActive
  );
}

function getParticipantList() {
  return Object.values(state.players || {});
}

function getActiveBattlePlayers() {
  return getParticipantList().filter((p) => (p.role === "host" || p.role === "player") && !p.disconnected);
}

function getNonHostBattlePlayers() {
  return getParticipantList().filter((p) => p.role === "player" && !p.disconnected);
}

function getSpectators() {
  return getParticipantList().filter((p) => p.role === "spectator" && !p.disconnected);
}

function getLocalGrandCounts() {
  const scopeCounties = getScopeCounties();
  const scopeTowns = getScopeTowns();
  const regionTotal = state.difficulty === "county_only" ? scopeCounties.length : scopeTowns.length;
  const regionCurrent =
    state.difficulty === "county_only"
      ? Array.from(state.unlockedCounties).filter((c) => state.selectedCounties.has(c)).length
      : Array.from(state.unlockedTowns).filter((id) => {
          const t = ALL_TOWNS.find((x) => x.id === id);
          return t && state.selectedCounties.has(t.countyName);
        }).length;

  const activeSt = getActiveQuizStations();
  const stationTotal = activeSt.length;
  const stationCurrent = activeSt.filter((s) => state.unlockedStations.has(s.key)).length;
  const macroProgress = {};
  if (regionTotal > 0) {
    macroProgress["地區"] = { cur: regionCurrent, tot: regionTotal };
  }
  ["台鐵", "高鐵", "捷運", "輕軌", "纜車", "林鐵", "糖鐵"].forEach((k) => {
    const mStations = activeSt.filter((s) => s.macro === k);
    if (mStations.length > 0) {
      macroProgress[k] = {
        cur: mStations.filter((s) => state.unlockedStations.has(s.key)).length,
        tot: mStations.length
      };
    }
  });

  return {
    regionCurrent,
    regionTotal,
    stationCurrent,
    stationTotal,
    grandCurrent: regionCurrent + stationCurrent,
    grandTotal: regionTotal + stationTotal,
    macroProgress
  };
}

function ensureLocalPlayerInRoster() {
  if (!state.roomCode && !state.aiRivalActive) return;
  const counts = getLocalGrandCounts();
  const myName =
    document.getElementById("p2p-nickname-input")?.value.trim() ||
    state.nickname ||
    (state.isHost ? "房主" : "玩家");
  state.nickname = myName;
  try {
    localStorage.setItem("tw_geomaster_nickname", myName);
  } catch (_) {}

  const existing = state.players[state.localInstanceId] || {};
  state.players[state.localInstanceId] = {
    ...existing,
    id: state.localInstanceId,
    deviceId: state.deviceId,
    name: myName,
    role: state.isHost ? "host" : state.role === "spectator" ? "spectator" : "player",
    isReady: state.isHost ? true : Boolean(state.isReady),
    disconnected: false,
    finished: Boolean(state.finished),
    finishReason: state.finalStats?.reason || existing.finishReason || null,
    score: counts.regionCurrent,
    total: counts.regionTotal,
    stationScore: counts.stationCurrent,
    stationTotal: counts.stationTotal,
    macroProgress: counts.macroProgress,
    finalStats: state.finalStats || existing.finalStats || null,
    unlockedTowns: Array.from(state.unlockedTowns),
    unlockedCounties: Array.from(state.unlockedCounties),
    unlockedProvinces: Array.from(state.unlockedProvinces),
    missedTowns: Array.from(state.missedTowns),
    unlockedStations: Array.from(state.unlockedStations),
    missedStations: Array.from(state.missedStations),
    targetId: state.targetId || null,
    targetStationKey: state.targetStationKey || null,
    elapsedSec: state.elapsedSec || 0,
    stats: { ...state.stats },
    _viewSets: null
  };
  saveActiveSessionToStorage();
}

function getSortedActiveBattlePlayers() {
  const active = getActiveBattlePlayers();
  if (typeof sortBattlePlayers === "function") {
    return sortBattlePlayers(active);
  }
  return [...active].sort((a, b) => {
    const aTot = (a.total || 0) + (a.stationTotal || 0);
    const bTot = (b.total || 0) + (b.stationTotal || 0);
    const aCur = (a.score || 0) + (a.stationScore || 0);
    const bCur = (b.score || 0) + (b.stationScore || 0);
    const aPct = aTot > 0 ? aCur / aTot : 0;
    const bPct = bTot > 0 ? bCur / bTot : 0;
    return bPct - aPct || bCur - aCur;
  });
}

function syncPrimaryOpponentFromRoster() {
  const sorted = getSortedActiveBattlePlayers();
  const others = sorted.filter((p) => p.id !== state.localInstanceId);

  if (state.role === "spectator") {
    // Ensure spectator is watching a valid active player
    if (
      !state.spectatingPlayerId ||
      !state.players[state.spectatingPlayerId] ||
      state.players[state.spectatingPlayerId].role === "spectator"
    ) {
      state.spectatingPlayerId = sorted[0]?.id || null;
    }
  }

  if (others.length === 0) {
    if (!state.aiRivalActive && !state.roomCode) {
      state.opponent.connected = false;
    }
    return;
  }

  // Pick the leading opponent (or 2nd place if spectating 1st place)
  const primary =
    state.role === "spectator" && others.length > 1 && others[0].id === state.spectatingPlayerId
      ? others[1]
      : others[0];

  state.opponent.connected = true;
  state.opponent.name = primary.name || "對手";
  state.opponent.isReady = Boolean(primary.isReady);
  state.opponent.score = primary.score || 0;
  state.opponent.total = primary.total || 0;
  state.opponent.stationScore = primary.stationScore || 0;
  state.opponent.stationTotal = primary.stationTotal || 0;
  state.opponent.macroProgress = primary.macroProgress || {};
  state.opponent.finished = Boolean(primary.finished);
  state.opponent.finalStats = primary.finalStats || null;
}

function getHostSyncConfig(isSettingChange = false) {
  const lruleEl = document.getElementById("p2p-layer-rule-select");
  const flayerEl = document.getElementById("p2p-forced-layer-select");
  const rruleEl = document.getElementById("p2p-rail-rule-select");
  return {
    quizTargetMode: state.quizTargetMode || "region",
    showStationTerminusHints: Boolean(state.showStationTerminusHints),
    selectedCounties: Array.from(state.selectedCounties),
    quizStationLines: Array.from(state.quizStationLines),
    difficulty: state.difficulty,
    playMode: state.playMode,
    timerMode: state.timerMode,
    countdownTotalSec: state.countdownTotalSec,
    layerRule: lruleEl ? lruleEl.value : state.p2pLayerRule,
    forcedLayer: flayerEl ? flayerEl.value : state.p2pForcedLayer,
    railRule: rruleEl ? rruleEl.value : state.p2pRailRule,
    isSettingChange: Boolean(isSettingChange)
  };
}

// ============================================================================
// SESSION PERSISTENCE BY DEVICE ID (重開網頁自動回到同一個 Session 與進度)
// ============================================================================
const SESSION_STORAGE_KEY_PREFIX = "tw_geomaster_session_";

function getSessionStorageKey() {
  return SESSION_STORAGE_KEY_PREFIX + (state.deviceId || state.localInstanceId);
}

function saveActiveSessionToStorage() {
  if (!state.roomCode) return;
  try {
    const snap = {
      deviceId: state.deviceId,
      roomCode: state.roomCode,
      roomPassword: state.roomPassword || "",
      isHost: Boolean(state.isHost),
      role: state.role,
      nickname: state.nickname,
      matchInProgress: Boolean(state.matchInProgress),
      isReady: Boolean(state.isReady),
      finished: Boolean(state.finished),
      finalStats: state.finalStats || null,
      elapsedSec: state.elapsedSec || 0,
      unlockedTowns: Array.from(state.unlockedTowns),
      unlockedCounties: Array.from(state.unlockedCounties),
      unlockedProvinces: Array.from(state.unlockedProvinces),
      missedTowns: Array.from(state.missedTowns),
      unlockedStations: Array.from(state.unlockedStations),
      missedStations: Array.from(state.missedStations),
      targetId: state.targetId || null,
      targetStationKey: state.targetStationKey || null,
      stats: { ...state.stats },
      config: getHostSyncConfig(false),
      playersSnapshot: state.isHost ? state.players : null,
      savedAt: Date.now()
    };
    localStorage.setItem(getSessionStorageKey(), JSON.stringify(snap));
  } catch (_) {}
}

function loadSavedSessionFromStorage() {
  try {
    const raw = localStorage.getItem(getSessionStorageKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.roomCode) return null;
    // Expire after 6 hours
    if (Date.now() - (data.savedAt || 0) > 6 * 3600 * 1000) {
      localStorage.removeItem(getSessionStorageKey());
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

function clearSavedSessionFromStorage() {
  try {
    localStorage.removeItem(getSessionStorageKey());
  } catch (_) {}
}

function restoreLocalSessionProgress(snap) {
  if (!snap) return;
  if (Array.isArray(snap.unlockedTowns)) state.unlockedTowns = new Set(snap.unlockedTowns);
  if (Array.isArray(snap.unlockedCounties)) state.unlockedCounties = new Set(snap.unlockedCounties);
  if (Array.isArray(snap.unlockedProvinces)) state.unlockedProvinces = new Set(snap.unlockedProvinces);
  if (Array.isArray(snap.missedTowns)) state.missedTowns = new Set(snap.missedTowns);
  if (Array.isArray(snap.unlockedStations)) state.unlockedStations = new Set(snap.unlockedStations);
  if (Array.isArray(snap.missedStations)) state.missedStations = new Set(snap.missedStations);
  if (snap.targetId !== undefined) state.targetId = snap.targetId;
  if (snap.targetStationKey !== undefined) state.targetStationKey = snap.targetStationKey;
  if (typeof snap.elapsedSec === "number") state.elapsedSec = snap.elapsedSec;
  if (snap.stats) state.stats = { ...state.stats, ...snap.stats };
  state.finished = Boolean(snap.finished);
  state.isGameOver = Boolean(snap.finished);
  state.finalStats = snap.finalStats || null;

  updatePrefixDropdownUI();
  updateRoadAndRailwayTileOverlays();
  refreshAllPolygonStyles();
  renderSmartLabelsAndLeaderLines();
  updateScoreAndProgressUI();
  updateTargetBannerUI();

  if (state.matchInProgress && !state.finished && state.role !== "spectator") {
    startTimer();
  }
}

function resumeSavedRoomSession(saved) {
  if (!saved || !saved.roomCode) return;
  document.getElementById("session-restore-banner")?.classList.add("hidden");
  if (saved.nickname) {
    state.nickname = saved.nickname;
    const nickInput = document.getElementById("p2p-nickname-input");
    if (nickInput) nickInput.value = saved.nickname;
  }
  const passInput = document.getElementById("p2p-password-input");
  if (passInput && saved.roomPassword) passInput.value = saved.roomPassword;
  const hostPassInput = document.getElementById("p2p-host-password-input");
  if (hostPassInput && saved.roomPassword) hostPassInput.value = saved.roomPassword;

  if (saved.isHost) {
    if (saved.config) applyRemoteSyncConfig(saved.config, true, true);
    hostP2PRoom(saved.roomCode, saved.roomPassword || "", saved.playersSnapshot || null);
    state.matchInProgress = Boolean(saved.matchInProgress);
    restoreLocalSessionProgress(saved);
    broadcastRosterFromHost();
    setFeedback(`🔄 已使用裝置 ID (${state.deviceId.slice(0, 12)}) 恢復房主房間【${saved.roomCode}】與答題進度！`, "tier");
  } else {
    const chkSpec = document.getElementById("chk-p2p-join-spectate");
    if (chkSpec) chkSpec.checked = saved.role === "spectator";
    joinP2PRoom(saved.roomCode, {
      password: saved.roomPassword || "",
      preferredRole: saved.role || "spectator",
      isReconnect: true
    });
  }
}

function leaveP2PRoom() {
  if (state.roomCode) {
    sendP2PMessage("LOBBY_LEAVE", { name: state.nickname });
  }
  if (state.peer) {
    try { state.peer.destroy(); } catch (_) {}
    state.peer = null;
  }
  state.conn = null;
  state.peers = new Map();
  state.players = {};
  state.roomCode = "";
  state.roomPassword = "";
  state.isHost = false;
  state.role = "solo";
  state.spectatingPlayerId = null;
  state.spectatorLayerInitialized = false;
  state.pendingConfigProposal = null;
  state.matchInProgress = false;
  state.isReady = false;
  state.opponent.connected = false;
  state.opponent.isReady = false;
  clearSavedSessionFromStorage();

  document.getElementById("modal-config-vote")?.classList.add("hidden");
  const dot = document.getElementById("p2p-status-dot");
  if (dot) dot.className = "w-2 h-2 rounded-full bg-slate-500";
  applyP2PLayerRule("free", state.mapLayer || "vector", "free");
  updateP2PPanelVisibility();
  updateP2PLobbyUI();
  refreshAllPolygonStyles();
  updateRoadAndRailwayTileOverlays();
  updateScoreAndProgressUI();
  setFeedback("🚪 已離開多人房間，切回單人模式", "info");
}

// ============================================================================
// SPECTATOR VIEW SWITCHING & LAYER FREEDOM
// ============================================================================
function setSpectatingTarget(playerId) {
  if (!playerId || !state.players[playerId]) {
    state.spectatingPlayerId = null;
  } else {
    state.spectatingPlayerId = playerId;
    state.players[playerId]._viewSets = null;
  }
  const sel = document.getElementById("spectator-player-select");
  if (sel && sel.value !== (state.spectatingPlayerId || "")) {
    sel.value = state.spectatingPlayerId || "";
  }
  syncPrimaryOpponentFromRoster();
  refreshAllPolygonStyles();
  updateRoadAndRailwayTileOverlays();
  renderSmartLabelsAndLeaderLines();
  updateScoreAndProgressUI();
  updateTargetBannerUI();
  updateOpponentUI();

  const watched = state.spectatingPlayerId ? state.players[state.spectatingPlayerId] : null;
  if (watched) {
    setFeedback(`👁️ 已切換觀戰視角至選手【${watched.name}】的地圖與即時進度！`, "info");
  }
}

function updateSpectatorPlayerSelectUI() {
  const sel = document.getElementById("spectator-player-select");
  if (!sel) return;
  const activePlayers = getSortedActiveBattlePlayers();
  sel.replaceChildren();

  if (activePlayers.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "尚無參賽選手";
    sel.appendChild(opt);
    return;
  }

  activePlayers.forEach((p, idx) => {
    const tot = (p.total || 0) + (p.stationTotal || 0);
    const cur = (p.score || 0) + (p.stationScore || 0);
    const pct = tot > 0 ? ((cur / tot) * 100).toFixed(1) : "0.0";
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `#${idx + 1} ${p.name} (${cur}/${tot} · ${pct}%)`;
    sel.appendChild(opt);
  });

  if (state.spectatingPlayerId && state.players[state.spectatingPlayerId]) {
    sel.value = state.spectatingPlayerId;
  } else if (activePlayers[0]) {
    state.spectatingPlayerId = activePlayers[0].id;
    sel.value = activePlayers[0].id;
  }
}

function applySpectatorInputLock() {
  const isSpectator = state.role === "spectator" && Boolean(state.roomCode);
  const answerInput = document.getElementById("answer-input");
  const banner = document.getElementById("spectator-mode-banner");
  const bannerText = document.getElementById("spectator-banner-text");
  const joinBtn = document.getElementById("btn-spectator-join-next");

  if (banner) {
    if (isSpectator || (state.roomCode && state.finished && getActiveBattlePlayers().length > 1)) {
      banner.classList.remove("hidden");
      updateSpectatorPlayerSelectUI();
      if (bannerText) {
        const watched = state.spectatingPlayerId ? state.players[state.spectatingPlayerId] : null;
        const wName = watched ? `正在觀看【${watched.name}】` : "觀戰模式中";
        bannerText.textContent = isSpectator
          ? `👁️ ${wName}：可自由切換圖層（不受禁用限制，僅影響自己畫面）`
          : `🏁 你已完賽（${wName}）：可自由切換觀看其他選手作答進度`;
      }
      if (joinBtn) {
        joinBtn.classList.toggle("hidden", !isSpectator);
        joinBtn.disabled = state.matchInProgress;
        joinBtn.textContent = state.matchInProgress ? "⏳ 下局可參賽" : "🎮 切換為參賽選手";
        joinBtn.classList.toggle("opacity-50", state.matchInProgress);
        joinBtn.classList.toggle("cursor-not-allowed", state.matchInProgress);
      }
    } else {
      banner.classList.add("hidden");
    }
  }

  if (answerInput) {
    answerInput.disabled = isSpectator;
    if (isSpectator) {
      answerInput.value = "";
      answerInput.placeholder = "👁️ 觀戰模式中（可點上方選單或右側排行切換觀看選手地圖，點擊「切換參賽」即可作答）";
    } else if (answerInput.placeholder.includes("觀戰模式")) {
      answerInput.placeholder = "輸入行政區（注音選字Enter完成後自動判定，不中斷虛線）";
    }
  }
}

function toggleSpectatorRole() {
  if (!state.roomCode || state.isHost) return;
  if (state.matchInProgress && state.role === "spectator") {
    setFeedback("⏳ 目前比賽進行中，本局結束後即可切換為參賽選手！", "warn");
    return;
  }
  const nextRole = state.role === "spectator" ? "player" : "spectator";
  state.role = nextRole;
  state.isReady = false;
  if (nextRole === "player") {
    state.spectatingPlayerId = null;
    // Re-apply room layer locks when switching from spectator to player
    applyP2PLayerRule(state.p2pLayerRule, state.p2pForcedLayer, state.p2pRailRule);
  } else {
    const sorted = getSortedActiveBattlePlayers();
    state.spectatingPlayerId = sorted[0]?.id || null;
    applyP2PLayerRule(state.p2pLayerRule, state.p2pForcedLayer, state.p2pRailRule);
  }
  ensureLocalPlayerInRoster();
  sendP2PMessage("SYNC_ROLE_CHANGE", {
    role: nextRole,
    name: state.nickname,
    isReady: false
  });
  applySpectatorInputLock();
  updateP2PLobbyUI();
  refreshAllPolygonStyles();
  updateRoadAndRailwayTileOverlays();
  updateScoreAndProgressUI();
  updateOpponentUI();
  setFeedback(
    nextRole === "spectator"
      ? "👁️ 已切換為觀戰模式（可自由切換圖層與檢視各選手地圖）"
      : "🎮 已切換為參賽選手！請確認下方設定後點擊「準備 (Ready)」",
    "info"
  );
}

function updateP2PPanelVisibility() {
  const panel = document.getElementById("p2p-live-panel");
  if (!panel) return;
  const shouldShow = Boolean(state.roomCode || state.aiRivalActive || state.opponent.connected);
  panel.classList.toggle("hidden", !shouldShow);
  applySpectatorInputLock();
}

function syncSpectatorInitialLayers(rule, forcedLayer, railRule) {
  // Set spectator's initial default map layer and rail mode to match the players,
  // but do NOT lock the spectator's controls afterward.
  const defaultBase = forcedLayer || "vector";
  setMapBaseLayer(defaultBase, true);
  if (railRule === "ban_rail") {
    state.transportMode = state.stationQuizEnabled && state.quizStationLines.size > 0 ? "stations_only" : "off";
  } else if (railRule === "force_lines") {
    state.transportMode = "lines_and_stations";
  } else if (railRule === "force_rail_only" || railRule === "ban_roads_only") {
    state.transportMode = "rail_only";
  }
  state.spectatorLayerInitialized = true;
  updateRoadAndRailwayTileOverlays();
}

function applyP2PLayerRule(rule, forcedLayer, railRule) {
  state.p2pLayerRule = rule || "free";
  state.p2pForcedLayer = forcedLayer || "vector";
  if (railRule) state.p2pRailRule = railRule;

  const badge = document.getElementById("layer-lock-badge");
  const switcher = document.getElementById("layer-switcher-pill");
  const railBtn = document.getElementById("btn-toggle-rail");
  const cfgBtn = document.getElementById("btn-open-transport-cfg");

  // Spectator rule: initial layer matches players, then 100% free local layer switching!
  if (state.role === "spectator" && state.roomCode) {
    if (!state.spectatorLayerInitialized) {
      syncSpectatorInitialLayers(state.p2pLayerRule, state.p2pForcedLayer, state.p2pRailRule);
    }
    if (badge) {
      badge.classList.remove("hidden");
      badge.className = "apple-glass-pill px-2.5 py-1 rounded-xl text-[11px] font-bold text-amber-300 border border-amber-500/40 pointer-events-auto";
      badge.textContent = "👁️ 觀戰自由圖層 (僅影響自己畫面)";
    }
    if (switcher) switcher.classList.remove("opacity-60", "pointer-events-none");
    if (railBtn) railBtn.classList.remove("pointer-events-none", "opacity-50", "opacity-60");
    if (cfgBtn) cfgBtn.classList.remove("pointer-events-none", "opacity-50");
    updateRoadAndRailwayTileOverlays();
    return;
  }

  if (badge) {
    badge.className = "hidden apple-glass-pill px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-300 border border-rose-500/40 pointer-events-auto";
  }

  if (state.p2pLayerRule === "locked") {
    setMapBaseLayer(state.p2pForcedLayer, true);
    if (badge) {
      badge.classList.remove("hidden");
      badge.textContent = "🔒 對戰已鎖定圖層";
    }
    if (switcher) switcher.classList.add("opacity-60");
  } else {
    if (badge && state.p2pRailRule === "free") badge.classList.add("hidden");
    if (switcher) switcher.classList.remove("opacity-60");
  }

  if (state.p2pRailRule && state.p2pRailRule !== "free") {
    const hasStations = state.stationQuizEnabled && state.quizStationLines.size > 0;
    if (badge) {
      badge.classList.remove("hidden");
      badge.textContent =
        state.p2pRailRule === "ban_rail"
          ? hasStations
            ? "🚫 對戰已禁用路網 (僅允許開關車站點)"
            : "🚫 對戰已禁用(Ban)所有路網與車站"
          : state.p2pRailRule === "ban_roads_only"
          ? "🛑 對戰已禁用公路網 (保留軌道線+車站)"
          : state.p2pRailRule === "force_rail_only"
          ? "🚄 對戰強制純軌道路網"
          : "🛤️ 對戰強制完整路網";
    }
    updateRoadAndRailwayTileOverlays();
    if (railBtn) {
      if (
        (state.p2pRailRule === "ban_rail" && !hasStations) ||
        state.p2pRailRule === "force_lines" ||
        state.p2pRailRule === "force_rail_only"
      ) {
        railBtn.classList.add("opacity-60");
      } else {
        railBtn.classList.remove("opacity-60", "pointer-events-none");
      }
    }
    if (cfgBtn) {
      if (state.p2pRailRule === "ban_rail") cfgBtn.classList.add("pointer-events-none", "opacity-50");
      else cfgBtn.classList.remove("pointer-events-none", "opacity-50");
    }
  } else {
    if (railBtn) railBtn.classList.remove("pointer-events-none", "opacity-50", "opacity-60");
    if (cfgBtn) cfgBtn.classList.remove("pointer-events-none", "opacity-50");
  }
}

// ============================================================================
// UNANIMOUS CONSENT VOTE ENGINE FOR HOST DIFFICULTY / CONFIG CHANGES
// ============================================================================
function describeConfigDiff(patch) {
  const diffNames = {
    casual: "🟢 一般/休閒難度",
    county_only: "🔵 縣市模式 (22縣市)",
    hard_suffix: "🟡 進階後綴模式",
    hard_full: "🟠 困難全名模式",
    master_hierarchy: "🔥 最難：三階解鎖"
  };
  const pmNames = {
    free: "✍️ 自由默寫",
    target_random: "🎯 隨機指定區塊",
    target_click: "👆 點選指定區塊"
  };
  const qmNames = {
    region: "🗺️ 地區模式",
    station: "🚉 車站模式",
    mixed: "🔀 混合模式"
  };

  const lines = [];
  if (patch.difficulty && patch.difficulty !== state.difficulty) {
    lines.push(`挑戰難度：${diffNames[state.difficulty] || state.difficulty} ➔ ${diffNames[patch.difficulty] || patch.difficulty}`);
  }
  if (patch.quizTargetMode && patch.quizTargetMode !== state.quizTargetMode) {
    lines.push(`挑戰主模式：${qmNames[state.quizTargetMode] || state.quizTargetMode} ➔ ${qmNames[patch.quizTargetMode] || patch.quizTargetMode}`);
  }
  if (patch.playMode && patch.playMode !== state.playMode) {
    lines.push(`出題方式：${pmNames[state.playMode] || state.playMode} ➔ ${pmNames[patch.playMode] || patch.playMode}`);
  }
  if (patch.selectedCounties) {
    const newSet = new Set(patch.selectedCounties);
    lines.push(`行政區範圍：${state.selectedCounties.size} 縣市 ➔ ${newSet.size} 縣市`);
  }
  if (patch.quizStationLines) {
    const newLines = new Set(patch.quizStationLines);
    lines.push(`車站題庫：${state.quizStationLines.size} 條路線 ➔ ${newLines.size} 條路線`);
  }
  if (patch.timerMode) {
    const newTimerDesc = patch.timerMode === "up" ? "正計時" : `倒數 ${Math.round((patch.countdownTotalSec || state.countdownTotalSec) / 60)} 分鐘`;
    lines.push(`計時規則變更為：${newTimerDesc}`);
  }
  if (patch.layerRule || patch.forcedLayer || patch.railRule) {
    lines.push(`底圖/路網規則變更`);
  }
  if (lines.length === 0) {
    lines.push("更新房間題庫與比賽設定");
  }
  return lines;
}

function buildProposedConfigFromPatch(patch) {
  const base = getHostSyncConfig(true);
  if (patch.quizTargetMode) base.quizTargetMode = patch.quizTargetMode;
  if (patch.difficulty) base.difficulty = patch.difficulty;
  if (patch.playMode) base.playMode = patch.playMode;
  if (patch.selectedCounties) base.selectedCounties = Array.from(patch.selectedCounties);
  if (patch.quizStationLines) base.quizStationLines = Array.from(patch.quizStationLines);
  if (typeof patch.showStationTerminusHints === "boolean") {
    base.showStationTerminusHints = patch.showStationTerminusHints;
  }
  if (patch.timerMode) base.timerMode = patch.timerMode;
  if (patch.countdownTotalSec !== undefined) base.countdownTotalSec = patch.countdownTotalSec;
  if (patch.layerRule) base.layerRule = patch.layerRule;
  if (patch.forcedLayer) base.forcedLayer = patch.forcedLayer;
  if (patch.railRule) base.railRule = patch.railRule;

  if (base.quizTargetMode === "region") {
    base.quizStationLines = [];
  } else if (base.quizTargetMode === "station") {
    base.selectedCounties = [];
  }
  return base;
}

function requestOrApplyConfigChange(patch, changeLabel = "比賽設定") {
  // 1. Security Guard: Non-host in a multiplayer room CANNOT change difficulty or rules!
  if (!canLocalModifyGameConfig()) {
    setFeedback("🔒 防作弊保護：僅房主可發起難度與題庫變更（且須經全體參賽玩家同意）！", "error");
    playTone("error");
    renderScopeModalGrid();
    return false;
  }

  const proposedCfg = buildProposedConfigFromPatch(patch);
  const contestingClients = state.isHost && state.roomCode ? getNonHostBattlePlayers() : [];

  // 2. If in Solo mode OR Host has 0 contesting human players in room -> apply immediately!
  if (!state.roomCode || contestingClients.length === 0) {
    applyRemoteSyncConfig(proposedCfg, false, true);
    if (state.isHost && state.roomCode) {
      broadcastP2PConfig(true);
      broadcastRosterFromHost();
      updateP2PLobbyUI();
    }
    return true;
  }

  // 3. Host has >=1 contesting human players -> Require Unanimous Consent Vote!
  const diffDescriptions = describeConfigDiff(patch);
  const proposal = {
    proposalId: "vote_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    hostName: state.nickname || "房主",
    changeLabel,
    diffDescriptions,
    proposedConfig: proposedCfg,
    requiredVoters: contestingClients.map((p) => ({ id: p.id, name: p.name })),
    votes: {}
  };
  state.pendingConfigProposal = proposal;

  // Keep Host UI showing current state until vote passes
  renderScopeModalGrid();
  renderConfigVoteModalUI(proposal);
  sendP2PMessage("CONFIG_CHANGE_PROPOSAL", proposal);
  setFeedback(`🗳️ 已向全體參賽玩家 (${contestingClients.length} 人) 發起「${changeLabel}」變更投票，全體同意後即生效！`, "warn");
  return false;
}

function renderConfigVoteModalUI(proposal) {
  const modal = document.getElementById("modal-config-vote");
  if (!modal || !proposal) return;

  const titleEl = document.getElementById("config-vote-title");
  const descEl = document.getElementById("config-vote-desc");
  const diffListEl = document.getElementById("config-vote-diff-list");
  const tallyEl = document.getElementById("config-vote-tally-text");
  const playersListEl = document.getElementById("config-vote-players-list");
  const playerActions = document.getElementById("config-vote-player-actions");
  const hostActions = document.getElementById("config-vote-host-actions");

  if (titleEl) {
    titleEl.textContent = state.isHost
      ? `⏳ 等待全體參賽玩家同意變更「${proposal.changeLabel}」`
      : `👑 房主【${proposal.hostName || "房主"}】申請變更「${proposal.changeLabel}」`;
  }
  if (descEl) {
    descEl.textContent = "為確保公平競技，難度與題庫變更須經房內全體參賽選手同意才會生效。";
  }

  if (diffListEl) {
    diffListEl.replaceChildren();
    (proposal.diffDescriptions || []).forEach((line) => {
      const div = document.createElement("div");
      div.className = "flex items-center gap-1.5 text-amber-200";
      div.textContent = `• ${line}`;
      diffListEl.appendChild(div);
    });
  }

  const voters = proposal.requiredVoters || [];
  const votes = proposal.votes || {};
  const approvedCount = voters.filter((v) => votes[v.id] === true).length;

  if (tallyEl) {
    tallyEl.textContent = `${approvedCount} / ${voters.length} 人已同意`;
  }

  if (playersListEl) {
    playersListEl.replaceChildren();
    voters.forEach((v) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]";
      const nSpan = document.createElement("span");
      nSpan.className = "font-bold text-white";
      nSpan.textContent = v.name + (v.id === state.localInstanceId ? " (你)" : "");
      const sSpan = document.createElement("span");
      if (votes[v.id] === true) {
        sSpan.className = "text-emerald-400 font-bold";
        sSpan.textContent = "✅ 已同意";
      } else if (votes[v.id] === false) {
        sSpan.className = "text-rose-400 font-bold";
        sSpan.textContent = "❌ 不同意";
      } else {
        sSpan.className = "text-amber-300";
        sSpan.textContent = "⏳ 投票中...";
      }
      row.appendChild(nSpan);
      row.appendChild(sSpan);
      playersListEl.appendChild(row);
    });
  }

  const isVoter = !state.isHost && state.role === "player" && voters.some((v) => v.id === state.localInstanceId);
  const hasVoted = votes[state.localInstanceId] !== undefined;

  if (playerActions) {
    playerActions.classList.toggle("hidden", !isVoter || hasVoted);
  }
  if (hostActions) {
    hostActions.classList.toggle("hidden", !state.isHost);
  }

  if (state.isHost || isVoter) {
    modal.classList.remove("hidden");
  }
}

function submitConfigChangeVote(approved) {
  const prop = state.pendingConfigProposal;
  if (!prop) return;
  prop.votes = prop.votes || {};
  prop.votes[state.localInstanceId] = Boolean(approved);
  renderConfigVoteModalUI(prop);
  sendP2PMessage("CONFIG_CHANGE_VOTE", {
    proposalId: prop.proposalId,
    approved: Boolean(approved),
    voterName: state.nickname || "玩家"
  });
}

function cancelHostConfigProposal() {
  if (!state.isHost || !state.pendingConfigProposal) return;
  const propId = state.pendingConfigProposal.proposalId;
  state.pendingConfigProposal = null;
  document.getElementById("modal-config-vote")?.classList.add("hidden");
  sendP2PMessage("CONFIG_CHANGE_RESULT", {
    proposalId: propId,
    approved: false,
    cancelledByHost: true
  });
  setFeedback("🚫 已撤回設定變更申請，維持原比賽設定", "info");
}

function handleIncomingConfigVoteOnHost(payload, senderId) {
  if (!state.isHost || !state.pendingConfigProposal) return;
  const prop = state.pendingConfigProposal;
  if (payload?.proposalId !== prop.proposalId) return;

  prop.votes = prop.votes || {};
  prop.votes[senderId] = Boolean(payload.approved);

  if (!payload.approved) {
    // Rejected by a contesting player -> abort proposal immediately!
    const rejecter = payload.voterName || state.players[senderId]?.name || "參賽玩家";
    state.pendingConfigProposal = null;
    document.getElementById("modal-config-vote")?.classList.add("hidden");
    renderScopeModalGrid();
    sendP2PMessage("CONFIG_CHANGE_RESULT", {
      proposalId: prop.proposalId,
      approved: false,
      rejectedBy: rejecter,
      changeLabel: prop.changeLabel
    });
    setFeedback(`❌ 參賽玩家【${rejecter}】不同意變更「${prop.changeLabel}」，已維持原設定！`, "error");
    playTone("error");
    return;
  }

  // Check if all required contesting players have approved
  const allApproved = prop.requiredVoters.every((v) => prop.votes[v.id] === true || state.players[v.id]?.disconnected);
  if (allApproved) {
    const finalCfg = prop.proposedConfig;
    const label = prop.changeLabel;
    state.pendingConfigProposal = null;
    document.getElementById("modal-config-vote")?.classList.add("hidden");

    applyRemoteSyncConfig(finalCfg, false, true);
    getNonHostBattlePlayers().forEach((p) => {
      p.isReady = false;
    });
    sendP2PMessage("CONFIG_CHANGE_RESULT", {
      proposalId: prop.proposalId,
      approved: true,
      config: finalCfg,
      changeLabel: label
    });
    broadcastRosterFromHost();
    updateP2PLobbyUI();
    setFeedback(`✅ 全體參賽玩家同意！已正式套用「${label}」變更。`, "tier");
    playTone("tier");
  } else {
    renderConfigVoteModalUI(prop);
    sendP2PMessage("CONFIG_VOTE_PROGRESS", {
      proposalId: prop.proposalId,
      votes: prop.votes
    });
  }
}

// ============================================================================
// P2P MESSAGE TRANSPORT & DISPATCHER
// ============================================================================
function sendP2PMessage(type, payload, targetId = null, excludeSenderId = null) {
  if (!state.roomCode && !state.aiRivalActive) return;
  const envelope = {
    type,
    payload,
    targetId: targetId || null,
    roomCode: state.roomCode || "",
    senderId: state.localInstanceId
  };

  if (state.isHost) {
    if (state.peers && state.peers.size > 0) {
      state.peers.forEach((conn, peerSenderId) => {
        if (targetId && peerSenderId !== targetId) return;
        if (excludeSenderId && peerSenderId === excludeSenderId) return;
        if (conn && conn.open) {
          try { conn.send(envelope); } catch (e) {}
        }
      });
    } else if (state.conn && state.conn.open) {
      try { state.conn.send(envelope); } catch (e) {}
    }
  } else {
    if (state.conn && state.conn.open) {
      try { state.conn.send(envelope); } catch (e) {}
    }
  }

  if (state.bcChannel && state.roomCode) {
    try { state.bcChannel.postMessage(envelope); } catch (e) {}
  }
}

function broadcastRosterFromHost() {
  if (!state.isHost || !state.roomCode) return;
  ensureLocalPlayerInRoster();
  sendP2PMessage("ROOM_ROSTER", {
    players: state.players,
    matchInProgress: state.matchInProgress
  });
}

function dispatchP2PMessage(msg, sourceConn = null) {
  if (!msg || !msg.type) return;
  if (msg.senderId && msg.senderId === state.localInstanceId) return;
  // Strict guard: never process messages when local user is not in a room or in a different room!
  if (!state.roomCode || !msg.roomCode || msg.roomCode !== state.roomCode) return;
  if (msg.targetId && msg.targetId !== state.localInstanceId) return;

  if (state.isHost && sourceConn && msg.senderId && msg.type !== "LOBBY_JOIN") {
    state.peers.set(msg.senderId, sourceConn);
  }

  if (msg.type === "LOBBY_JOIN") {
    if (!state.isHost) return;
    const reqPass = msg.payload?.password || "";
    if (state.roomPassword && reqPass !== state.roomPassword) {
      const rejectPayload = { reason: reqPass ? "WRONG_PASSWORD" : "PASSWORD_REQUIRED" };
      if (sourceConn && sourceConn.open) {
        try {
          sourceConn.send({
            type: "JOIN_REJECTED",
            payload: rejectPayload,
            targetId: msg.senderId,
            roomCode: state.roomCode,
            senderId: state.localInstanceId
          });
          setTimeout(() => { try { sourceConn.close(); } catch (_) {} }, 250);
        } catch (e) {}
      } else {
        sendP2PMessage("JOIN_REJECTED", rejectPayload, msg.senderId);
      }
      return;
    }

    if (sourceConn && msg.senderId) state.peers.set(msg.senderId, sourceConn);
    const existing = state.players[msg.senderId];
    const isReturningSession = Boolean(existing);

    // Issue 3: Join room as Spectator first by default unless reconnecting to an existing Player session
    // or explicitly joining via the Player invite link when match is not in progress.
    let assignedRole = "spectator";
    if (isReturningSession && existing.role && (msg.payload?.isReconnect || state.matchInProgress)) {
      assignedRole = existing.role;
    } else if (state.matchInProgress) {
      assignedRole = "spectator";
    } else if (msg.payload?.wantSpectate === false) {
      assignedRole = "player";
    } else {
      assignedRole = "spectator";
    }

    const cfg = getHostSyncConfig(false);
    const counts = getLocalGrandCounts();

    state.players[msg.senderId] = {
      id: msg.senderId,
      deviceId: msg.payload?.deviceId || msg.senderId,
      name: msg.payload?.name || existing?.name || "玩家",
      role: assignedRole,
      isReady: isReturningSession && assignedRole === existing?.role ? Boolean(existing.isReady) : false,
      disconnected: false,
      finished: isReturningSession ? Boolean(existing.finished) : false,
      finishReason: isReturningSession ? existing.finishReason || null : null,
      score: isReturningSession ? existing.score || 0 : 0,
      total: counts.regionTotal,
      stationScore: isReturningSession ? existing.stationScore || 0 : 0,
      stationTotal: counts.stationTotal,
      macroProgress: isReturningSession ? existing.macroProgress || {} : {},
      finalStats: isReturningSession ? existing.finalStats || null : null,
      unlockedTowns: isReturningSession && Array.isArray(existing.unlockedTowns) ? existing.unlockedTowns : [],
      unlockedCounties: isReturningSession && Array.isArray(existing.unlockedCounties) ? existing.unlockedCounties : [],
      unlockedProvinces: isReturningSession && Array.isArray(existing.unlockedProvinces) ? existing.unlockedProvinces : [],
      missedTowns: isReturningSession && Array.isArray(existing.missedTowns) ? existing.missedTowns : [],
      unlockedStations: isReturningSession && Array.isArray(existing.unlockedStations) ? existing.unlockedStations : [],
      missedStations: isReturningSession && Array.isArray(existing.missedStations) ? existing.missedStations : [],
      targetId: isReturningSession ? existing.targetId || null : null,
      targetStationKey: isReturningSession ? existing.targetStationKey || null : null,
      elapsedSec: isReturningSession ? existing.elapsedSec || 0 : 0,
      stats: isReturningSession ? existing.stats || null : null,
      _viewSets: null
    };

    ensureLocalPlayerInRoster();
    syncPrimaryOpponentFromRoster();

    const welcomePayload = {
      name: state.nickname || "房主",
      assignedRole,
      isReconnected: isReturningSession,
      restoredSession: isReturningSession ? state.players[msg.senderId] : null,
      matchInProgress: state.matchInProgress,
      config: cfg,
      players: state.players
    };
    sendP2PMessage("LOBBY_WELCOME", welcomePayload, msg.senderId);
    broadcastRosterFromHost();
    updateP2PPanelVisibility();
    updateP2PLobbyUI();
    updateOpponentUI();

    const roleLabel = assignedRole === "spectator" ? "觀戰者" : "參賽選手";
    setFeedback(
      isReturningSession
        ? `🔄 ${roleLabel}【${state.players[msg.senderId].name}】已透過裝置 ID 重新連回房間！`
        : `🎮 ${roleLabel}【${state.players[msg.senderId].name}】已進入房間！`,
      "tier"
    );
    playTone("tier");
  } else if (msg.type === "LOBBY_LEAVE") {
    if (state.players[msg.senderId]) {
      const leftName = state.players[msg.senderId].name;
      delete state.players[msg.senderId];
      if (state.peers) state.peers.delete(msg.senderId);
      setFeedback(`🚪 成員【${leftName}】已離開房間`, "warn");
      syncPrimaryOpponentFromRoster();
      if (state.isHost) broadcastRosterFromHost();
      updateP2PLobbyUI();
      updateOpponentUI();
      checkIfLocalIsLastPlayer();
    }
  } else if (msg.type === "JOIN_REJECTED") {
    const reason = msg.payload?.reason;
    const statusEl = document.getElementById("p2p-modal-status");
    const passInput = document.getElementById("p2p-password-input");
    openGameHubModal("join");
    const errMsg =
      reason === "PASSWORD_REQUIRED"
        ? "🔒 此房間設有密碼，請在左側輸入房間密碼後再點「連線入房」"
        : "❌ 房間密碼錯誤，請重新確認密碼後再試！";
    if (statusEl) statusEl.textContent = errMsg;
    if (passInput) {
      passInput.classList.add("border-rose-500");
      passInput.focus();
    }
    state.roomCode = "";
    state.role = "solo";
    state.opponent.connected = false;
    updateP2PPanelVisibility();
    updateP2PLobbyUI();
    setFeedback(errMsg, reason === "PASSWORD_REQUIRED" ? "warn" : "error");
    if (reason === "WRONG_PASSWORD") playTone("error");
  } else if (msg.type === "LOBBY_WELCOME") {
    if (state.isHost) return;
    if (state._joinTimeoutTimer) {
      clearTimeout(state._joinTimeoutTimer);
      state._joinTimeoutTimer = null;
    }
    state.opponent.connected = true;
    state.role = msg.payload?.assignedRole || "spectator";
    state.matchInProgress = Boolean(msg.payload?.matchInProgress);
    state.spectatorLayerInitialized = false;

    if (msg.payload?.players) {
      state.players = msg.payload.players;
      Object.values(state.players).forEach((p) => { p._viewSets = null; });
    }
    if (msg.payload?.config) {
      applyRemoteSyncConfig(msg.payload.config, true, true);
    }
    if (msg.payload?.restoredSession) {
      restoreLocalSessionProgress(msg.payload.restoredSession);
    }

    ensureLocalPlayerInRoster();
    syncPrimaryOpponentFromRoster();
    updateP2PPanelVisibility();
    updateP2PLobbyUI();
    updateOpponentUI();
    refreshAllPolygonStyles();
    updateRoadAndRailwayTileOverlays();
    updateScoreAndProgressUI();

    const msgText = msg.payload?.isReconnected
      ? `🔄 已透過裝置 ID 恢復你在房間 ${state.roomCode} 的連線與進度！`
      : state.role === "spectator"
      ? `👁️ 已以「觀戰模式」進入房間 ${state.roomCode}！可隨時查看各選手地圖或點擊「切換為參賽選手」`
      : `🎮 已以「參賽選手」加入房間 ${state.roomCode}！請確認下方設定後點擊準備`;
    const statusEl = document.getElementById("p2p-modal-status");
    if (statusEl) statusEl.textContent = msgText;
    setFeedback(msgText, "info");
    playTone("unlock");
  } else if (msg.type === "ROOM_ROSTER") {
    if (state.isHost) return;
    if (msg.payload?.players) {
      state.players = msg.payload.players;
      Object.values(state.players).forEach((p) => { p._viewSets = null; });
      if (state.players[state.localInstanceId]) {
        state.role = state.players[state.localInstanceId].role;
      }
    }
    if (typeof msg.payload?.matchInProgress === "boolean") {
      state.matchInProgress = msg.payload.matchInProgress;
    }
    syncPrimaryOpponentFromRoster();
    updateP2PPanelVisibility();
    updateP2PLobbyUI();
    updateOpponentUI();
    if (state.role === "spectator" || state.finished) {
      refreshAllPolygonStyles();
      updateRoadAndRailwayTileOverlays();
      renderSmartLabelsAndLeaderLines();
      updateScoreAndProgressUI();
    }
    checkIfLocalIsLastPlayer();
  } else if (msg.type === "SYNC_ROLE_CHANGE") {
    if (!state.isHost) return;
    const p = state.players[msg.senderId];
    if (!p) return;
    if (state.matchInProgress && msg.payload?.role === "player") return;
    p.role = msg.payload?.role === "spectator" ? "spectator" : "player";
    p.isReady = false;
    if (msg.payload?.name) p.name = msg.payload.name;
    syncPrimaryOpponentFromRoster();
    broadcastRosterFromHost();
    updateP2PLobbyUI();
    updateOpponentUI();
  } else if (msg.type === "SYNC_STATE") {
    handleIncomingP2PData(msg.payload, msg.senderId);
    if (state.isHost) {
      // Relay to all other clients & spectators (excluding original sender)
      sendP2PMessage("SYNC_STATE", { ...msg.payload, senderId: msg.senderId }, null, msg.senderId);
    }
  } else if (msg.type === "SYNC_START") {
    if (state.isHost) return;
    startSynchronizedP2PCountdown(msg.payload, false);
  } else if (msg.type === "SYNC_CONFIG") {
    if (state.isHost) return;
    applyRemoteSyncConfig(msg.payload, false, true);
  } else if (msg.type === "CONFIG_CHANGE_PROPOSAL") {
    if (state.isHost) return;
    state.pendingConfigProposal = msg.payload;
    if (state.role === "player") {
      renderConfigVoteModalUI(msg.payload);
      playTone("tier");
      setFeedback(`🗳️ 房主申請變更「${msg.payload?.changeLabel || "難度/設定"}」，請在彈窗中投票表決！`, "warn");
    } else {
      setFeedback(`⏳ 房主發起「${msg.payload?.changeLabel || "難度/設定"}」變更投票，等待全體參賽選手同意中...`, "info");
    }
  } else if (msg.type === "CONFIG_CHANGE_VOTE") {
    handleIncomingConfigVoteOnHost(msg.payload, msg.senderId);
  } else if (msg.type === "CONFIG_VOTE_PROGRESS") {
    if (state.pendingConfigProposal && msg.payload?.proposalId === state.pendingConfigProposal.proposalId) {
      state.pendingConfigProposal.votes = msg.payload.votes || {};
      renderConfigVoteModalUI(state.pendingConfigProposal);
    }
  } else if (msg.type === "CONFIG_CHANGE_RESULT") {
    state.pendingConfigProposal = null;
    document.getElementById("modal-config-vote")?.classList.add("hidden");
    if (msg.payload?.approved && msg.payload?.config) {
      applyRemoteSyncConfig(msg.payload.config, false, true);
      setFeedback(`✅ 全體參賽玩家同意！已更新「${msg.payload.changeLabel || "比賽設定"}」`, "tier");
      playTone("tier");
    } else {
      renderScopeModalGrid();
      const reason = msg.payload?.cancelledByHost
        ? "🚫 房主已撤回設定變更申請，維持原設定"
        : `❌ 參賽玩家【${msg.payload?.rejectedBy || "選手"}】不同意變更，維持原難度與題庫設定！`;
      setFeedback(reason, "warn");
    }
  } else if (msg.type === "SYNC_READY_STATUS") {
    const targetId = msg.senderId;
    if (state.players[targetId]) {
      if (msg.payload?.name) state.players[targetId].name = msg.payload.name;
      state.players[targetId].isReady = Boolean(msg.payload?.ready);
    }
    syncPrimaryOpponentFromRoster();
    if (state.isHost) {
      broadcastRosterFromHost();
      playTone(msg.payload?.ready ? "unlock" : "error");
      setFeedback(
        `玩家【${msg.payload?.name || "對手"}】${msg.payload?.ready ? "已準備完成！" : "取消了準備"}`,
        msg.payload?.ready ? "tier" : "warn"
      );
    }
    updateP2PLobbyUI();
  } else if (msg.type === "SYNC_PLAYER_FINISHED") {
    handleOpponentFinished(msg.payload, msg.senderId);
    if (state.isHost) {
      sendP2PMessage("SYNC_PLAYER_FINISHED", { ...msg.payload, senderId: msg.senderId }, null, msg.senderId);
      broadcastRosterFromHost();
    }
  } else if (msg.type === "REMATCH_REQUEST") {
    handleRematchRequest(msg.payload);
  } else if (msg.type === "REMATCH_ACCEPT") {
    handleRematchAccepted(msg.senderId);
  } else if (msg.type === "REMATCH_DECLINE") {
    handleRematchDeclined(msg.payload);
  } else if (msg.type === "RETURN_TO_LOBBY_REQUEST") {
    if (state.isHost) {
      setFeedback(`玩家【${msg.payload?.sender || "對手"}】請求回到大廳重新設定`, "info");
      executeReturnToLobby();
    }
  } else if (msg.type === "RETURN_TO_LOBBY") {
    executeReturnToLobby();
  }
}

// ============================================================================
// MVC LOBBY & ROSTER RENDERING (Using <template> DOM Cloning)
// ============================================================================
function renderMultiplayerLobbyRoster() {
  const rosterWrap = document.getElementById("p2p-multiplayer-roster");
  const rosterTitle = document.getElementById("p2p-roster-title");
  const rosterList = document.getElementById("p2p-roster-list");
  if (!rosterWrap || !rosterList) return;

  const list = getParticipantList();
  if (!state.roomCode && !state.aiRivalActive) {
    rosterWrap.classList.add("hidden");
    rosterList.replaceChildren();
    return;
  }

  rosterWrap.classList.remove("hidden");
  const activeCount = getActiveBattlePlayers().length;
  const specCount = getSpectators().length;
  if (rosterTitle) {
    rosterTitle.textContent = `房間完整名單 (共 ${list.length} 人：參賽 ${activeCount} · 觀戰 ${specCount})`;
  }

  rosterList.replaceChildren();
  const tpl = document.getElementById("tpl-p2p-roster-item");
  list.forEach((p) => {
    if (!tpl || !tpl.content) return;
    const row = tpl.content.firstElementChild.cloneNode(true);
    const isMe = p.id === state.localInstanceId;
    const nameEl = row.querySelector(".roster-name");
    const devEl = row.querySelector(".roster-dev");
    const badgeEl = row.querySelector(".roster-badge");

    if (nameEl) nameEl.textContent = `${p.name}${isMe ? " (你)" : ""}`;
    if (devEl) devEl.textContent = p.disconnected ? "[斷線待重連]" : `#${(p.deviceId || p.id || "").slice(-4)}`;
    if (badgeEl) {
      if (p.disconnected) {
        badgeEl.className = "roster-badge px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold shrink-0";
        badgeEl.textContent = "🔌 斷線保留中";
      } else if (p.role === "host") {
        badgeEl.className = "roster-badge px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold shrink-0";
        badgeEl.textContent = "👑 房主";
      } else if (p.role === "spectator") {
        badgeEl.className = "roster-badge px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0";
        badgeEl.textContent = "👁️ 觀戰";
      } else if (p.isReady) {
        badgeEl.className = "roster-badge px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0";
        badgeEl.textContent = "✓ 已準備";
      } else {
        badgeEl.className = "roster-badge px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold shrink-0";
        badgeEl.textContent = "⏳ 準備中";
      }
    }
    rosterList.appendChild(row);
  });
}

function updateRoomShareLinksUI() {
  const specInput = document.getElementById("p2p-share-url-spectate");
  const playInput = document.getElementById("p2p-share-url-play");
  const legacyInput = document.getElementById("p2p-share-url");
  const lockHint = document.getElementById("p2p-password-lock-hint");

  if (!state.roomCode) {
    if (specInput) specInput.value = "尚未建立或加入房間";
    if (playInput) playInput.value = "尚未建立或加入房間";
    if (legacyInput) legacyInput.value = "尚未建立房間";
    if (lockHint) lockHint.classList.add("hidden");
    return;
  }

  const rawBase = window.location.href.split("?")[0].split("#")[0];
  const baseUrl = (!window.location.origin || window.location.origin === "null") ? rawBase : `${window.location.origin}${window.location.pathname}`;
  const specUrl = `${baseUrl}?room=${state.roomCode}&mode=spectate`;
  const playUrl = `${baseUrl}?room=${state.roomCode}&mode=player`;

  if (specInput) specInput.value = specUrl;
  if (playInput) playInput.value = playUrl;
  if (legacyInput) legacyInput.value = specUrl;
  if (lockHint) lockHint.classList.toggle("hidden", !state.roomPassword);
}

function updateP2PLobbyUI() {
  const devBadge = document.getElementById("device-id-badge");
  if (devBadge) {
    devBadge.textContent = `裝置ID: ${state.deviceId.slice(0, 12)}`;
  }

  const myName =
    document.getElementById("p2p-nickname-input")?.value.trim() ||
    state.nickname ||
    "GeoMasterTW";
  state.nickname = myName;

  ensureLocalPlayerInRoster();
  updateRoomShareLinksUI();
  if (typeof syncP2PRoomAccordionUI === "function") syncP2PRoomAccordionUI();

  const roleIndicator = document.getElementById("p2p-role-indicator");
  const myAvatar = document.getElementById("p2p-my-avatar");
  const myNameDisp = document.getElementById("p2p-my-name-display");
  const myRoleBadge = document.getElementById("p2p-my-role-badge");
  const myReadyBadge = document.getElementById("p2p-my-ready-badge");
  const myReadyBtn = document.getElementById("btn-p2p-toggle-ready");
  const myReadyIcon = document.getElementById("p2p-ready-btn-icon");
  const myReadyText = document.getElementById("p2p-ready-btn-text");

  const oppNameDisp = document.getElementById("p2p-opp-name-display");
  const oppRoleBadge = document.getElementById("p2p-opp-role-badge");
  const oppReadyBadge = document.getElementById("p2p-opp-ready-badge");
  const oppAvatar = document.getElementById("p2p-opp-avatar");
  const lobbyCountEl = document.getElementById("p2p-lobby-count");
  const startBtn = document.getElementById("btn-p2p-sync-start");
  const startBtnIcon = document.getElementById("p2p-start-btn-icon");
  const startBtnText = document.getElementById("p2p-start-btn-text");
  const warningBanner = document.getElementById("p2p-re-ready-warning");
  const leaveBtn = document.getElementById("btn-p2p-leave");

  const layerRuleSelect = document.getElementById("p2p-layer-rule-select");
  const forcedLayerSelect = document.getElementById("p2p-forced-layer-select");
  const railRuleSelect = document.getElementById("p2p-rail-rule-select");
  const guestSettingsNote = document.getElementById("p2p-guest-settings-note");
  const roleSwitchBar = document.getElementById("p2p-role-switch-bar");
  const roleSwitchBtn = document.getElementById("btn-p2p-switch-role");
  const specStatusText = document.getElementById("p2p-spectator-status-text");

  const settingsFieldset = document.getElementById("unified-settings-fieldset");
  const guestReadonlyBanner = document.getElementById("guest-readonly-banner");
  const guestReadonlySummary = document.getElementById("guest-readonly-summary");
  const applyScopeBtn = document.getElementById("btn-apply-scope");

  if (myNameDisp) myNameDisp.textContent = myName;
  if (leaveBtn) leaveBtn.classList.toggle("hidden", !state.roomCode && !state.aiRivalActive);

  // =========================================================================
  // CASE 1: NOT IN ANY ROOM YET (Solo / Standby — Fixes Phantom Host/Client!)
  // =========================================================================
  if (!state.roomCode && !state.aiRivalActive) {
    if (roleSwitchBar) roleSwitchBar.classList.add("hidden");
    if (myReadyBtn) myReadyBtn.classList.add("hidden");
    if (startBtn) startBtn.classList.add("hidden");
    if (warningBanner) warningBanner.classList.add("hidden");
    if (guestReadonlyBanner) guestReadonlyBanner.classList.add("hidden");
    if (settingsFieldset) settingsFieldset.disabled = false;

    if (roleIndicator) {
      roleIndicator.textContent =
        state.hubEntryTab === "host"
          ? "👑 準備建立多人房間"
          : state.hubEntryTab === "join"
          ? "👁️ 準備加入房間 / 觀戰"
          : "👤 單人挑戰模式";
      roleIndicator.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30";
    }
    if (myAvatar) myAvatar.textContent = "👤";
    if (myRoleBadge) {
      myRoleBadge.textContent = "⚪ 尚未進入房間 (單人模式)";
      myRoleBadge.className = "text-[10px] font-bold text-slate-400";
    }
    if (myReadyBadge) {
      myReadyBadge.textContent = "單人待機";
      myReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0";
    }
    if (oppAvatar) oppAvatar.textContent = "⏳";
    if (oppNameDisp) {
      oppNameDisp.textContent = "尚未連線其他玩家";
      oppNameDisp.className = "font-extrabold text-slate-400 text-xs truncate max-w-[140px]";
    }
    if (oppRoleBadge) {
      oppRoleBadge.textContent = "⚪ 點擊上方「建立新房間」或輸入房號加入";
      oppRoleBadge.className = "text-[10px] font-bold text-slate-500";
    }
    if (oppReadyBadge) {
      oppReadyBadge.textContent = "未開房";
      oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 shrink-0";
    }
    if (lobbyCountEl) lobbyCountEl.textContent = "尚未建立或加入房間";

    if (layerRuleSelect) layerRuleSelect.disabled = false;
    if (forcedLayerSelect) forcedLayerSelect.disabled = false;
    if (railRuleSelect) railRuleSelect.disabled = false;
    if (guestSettingsNote) guestSettingsNote.classList.add("hidden");
    if (applyScopeBtn) applyScopeBtn.textContent = "🚀 確認設定並開始單人挑戰";

    renderMultiplayerLobbyRoster();
    return;
  }

  // =========================================================================
  // CASE 2: HOST IN ACTIVE ROOM
  // =========================================================================
  const nonHostPlayers = getNonHostBattlePlayers();
  const spectators = getSpectators();
  const allNonHostReady =
    (nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.isReady)) ||
    (state.aiRivalActive && state.opponent.isReady);

  if (state.isHost) {
    if (roleSwitchBar) roleSwitchBar.classList.add("hidden");
    if (guestReadonlyBanner) guestReadonlyBanner.classList.add("hidden");
    if (settingsFieldset) settingsFieldset.disabled = false;

    if (roleIndicator) {
      roleIndicator.textContent = `👑 房主主控台 (${state.roomCode || "AI陪練"})`;
      roleIndicator.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30";
    }
    if (myAvatar) myAvatar.textContent = "👑";
    if (myRoleBadge) {
      myRoleBadge.textContent = "👑 房主 (Host)";
      myRoleBadge.className = "text-[10px] font-bold text-sky-400";
    }
    if (myReadyBadge) {
      myReadyBadge.textContent = "👑 房主就緒";
      myReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0";
    }
    if (myReadyBtn) myReadyBtn.classList.add("hidden");
    if (warningBanner) warningBanner.classList.add("hidden");

    const readyCount = nonHostPlayers.filter((p) => p.isReady).length;
    const hasOpponents = nonHostPlayers.length > 0 || state.aiRivalActive;

    if (oppAvatar) oppAvatar.textContent = hasOpponents ? "👥" : spectators.length > 0 ? "👁️" : "⏳";
    if (oppNameDisp) {
      if (state.aiRivalActive) oppNameDisp.textContent = state.opponent.name;
      else if (nonHostPlayers.length === 1) oppNameDisp.textContent = nonHostPlayers[0].name;
      else if (nonHostPlayers.length > 1) oppNameDisp.textContent = `${nonHostPlayers.length} 位參賽選手`;
      else if (spectators.length > 0) oppNameDisp.textContent = `${spectators.length} 位觀戰者 (尚無參賽選手)`;
      else oppNameDisp.textContent = "等待玩家或觀戰者加入...";
    }
    if (oppRoleBadge) {
      oppRoleBadge.textContent =
        spectators.length > 0
          ? `🎮 參賽 ${nonHostPlayers.length} 人 · 👁️ 觀戰 ${spectators.length} 人`
          : hasOpponents
          ? `🎮 參賽選手 (${nonHostPlayers.length} 人)`
          : "⚪ 等待連線";
    }
    if (oppReadyBadge) {
      if (!hasOpponents) {
        oppReadyBadge.textContent = spectators.length > 0 ? `👁️ 觀戰 ${spectators.length} 人` : "⏳ 等待加入";
        oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0";
      } else if (allNonHostReady) {
        oppReadyBadge.textContent = `✓ 全員已準備 (${state.aiRivalActive ? 1 : readyCount}/${state.aiRivalActive ? 1 : nonHostPlayers.length})`;
        oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse shrink-0";
      } else {
        oppReadyBadge.textContent = `⏳ 準備中 (${readyCount}/${nonHostPlayers.length})`;
        oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0";
      }
    }

    if (lobbyCountEl) {
      if (!hasOpponents) lobbyCountEl.textContent = spectators.length > 0 ? `觀戰 ${spectators.length} 人 · 等待選手` : "等待玩家加入";
      else if (allNonHostReady) lobbyCountEl.textContent = "全員準備就緒！";
      else lobbyCountEl.textContent = `等待準備 (${readyCount}/${nonHostPlayers.length})`;
    }

    if (layerRuleSelect) layerRuleSelect.disabled = false;
    if (forcedLayerSelect) forcedLayerSelect.disabled = false;
    if (railRuleSelect) railRuleSelect.disabled = false;
    if (guestSettingsNote) guestSettingsNote.classList.add("hidden");

    if (startBtn) {
      startBtn.classList.remove("hidden");
      if (allNonHostReady) {
        startBtn.disabled = false;
        if (startBtnIcon) startBtnIcon.textContent = "🚀";
        if (startBtnText) startBtnText.textContent = "全員已準備，立即同步開局！";
        startBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center justify-center gap-2";
      } else if (!hasOpponents) {
        startBtn.disabled = true;
        if (startBtnIcon) startBtnIcon.textContent = "⏳";
        if (startBtnText) startBtnText.textContent = "等待至少 1 位參賽選手準備...";
        startBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-slate-800 text-slate-500 font-black text-sm transition cursor-not-allowed border border-slate-700 flex items-center justify-center gap-2";
      } else {
        startBtn.disabled = true;
        if (startBtnIcon) startBtnIcon.textContent = "⏳";
        if (startBtnText) startBtnText.textContent = `等待所有參賽選手準備 (${readyCount}/${nonHostPlayers.length})...`;
        startBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-slate-800 text-amber-300/90 font-black text-sm transition cursor-not-allowed border border-amber-500/30 flex items-center justify-center gap-2";
      }
    }
    if (applyScopeBtn) {
      applyScopeBtn.textContent = nonHostPlayers.length > 0 ? "🗳️ 變更設定並送交全體參賽者表決" : "✅ 確認設定並返回房間地圖";
    }
  } else {
    // =========================================================================
    // CASE 3: CLIENT PLAYER OR SPECTATOR IN ACTIVE ROOM (Read-Only Settings!)
    // =========================================================================
    const isSpec = state.role === "spectator";
    if (settingsFieldset) settingsFieldset.disabled = true;
    if (guestReadonlyBanner) {
      guestReadonlyBanner.classList.remove("hidden");
      if (guestReadonlySummary) {
        guestReadonlySummary.textContent = document.getElementById("scope-summary-label")?.textContent || "";
      }
    }

    if (roleSwitchBar && state.roomCode) {
      roleSwitchBar.classList.remove("hidden");
      if (specStatusText) {
        specStatusText.textContent = isSpec ? "👁️ 目前為觀戰模式 (免準備，可自由切圖層)" : "🎮 目前為參賽選手";
      }
      if (roleSwitchBtn) {
        roleSwitchBtn.textContent = isSpec ? "🎮 切換為參賽選手" : "👁️ 切換為觀戰模式";
        roleSwitchBtn.disabled = state.matchInProgress && isSpec;
      }
    }

    if (roleIndicator) {
      roleIndicator.textContent = isSpec ? `👁️ 觀戰模式 (${state.roomCode})` : `🎮 參賽選手 (${state.roomCode})`;
      roleIndicator.className = isSpec
        ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30"
        : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    }
    if (myAvatar) myAvatar.textContent = isSpec ? "👁️" : "🎮";
    if (myRoleBadge) {
      myRoleBadge.textContent = isSpec ? "👁️ 觀戰者 (Spectator)" : "🎮 參賽選手 (Player)";
      myRoleBadge.className = isSpec ? "text-[10px] font-bold text-amber-400" : "text-[10px] font-bold text-indigo-400";
    }
    if (myReadyBadge) {
      if (isSpec) {
        myReadyBadge.textContent = "👁️ 觀戰中";
        myReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0";
      } else {
        myReadyBadge.textContent = state.isReady ? "✓ 我已準備" : "⏳ 尚未準備";
        myReadyBadge.className = state.isReady
          ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0"
          : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse shrink-0";
      }
    }

    if (myReadyBtn) {
      if (isSpec) {
        myReadyBtn.classList.add("hidden");
      } else {
        myReadyBtn.classList.remove("hidden");
        if (state.isReady) {
          if (myReadyIcon) myReadyIcon.textContent = "✅";
          if (myReadyText) myReadyText.textContent = "已準備完成！等待房主開局 (點擊取消)";
          myReadyBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-black text-sm transition cursor-pointer flex items-center justify-center gap-2";
        } else {
          if (myReadyIcon) myReadyIcon.textContent = "⚡";
          if (myReadyText) myReadyText.textContent = "我已確認設定，點擊準備 (Ready)";
          myReadyBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition cursor-pointer animate-pulse flex items-center justify-center gap-2";
        }
      }
    }

    if (startBtn) startBtn.classList.add("hidden");

    const hostPlayer = getParticipantList().find((p) => p.role === "host");
    if (oppAvatar) oppAvatar.textContent = "👑";
    if (oppNameDisp) {
      oppNameDisp.textContent = hostPlayer ? `${hostPlayer.name} (房主)` : "連線至房主中...";
      oppNameDisp.className = "font-extrabold text-white text-xs truncate max-w-[140px]";
    }
    if (oppRoleBadge) {
      oppRoleBadge.textContent = `👑 房主 · 參賽 ${getActiveBattlePlayers().length} 人 · 觀戰 ${spectators.length} 人`;
      oppRoleBadge.className = "text-[10px] font-bold text-sky-400";
    }
    if (oppReadyBadge) {
      oppReadyBadge.textContent = state.matchInProgress ? "⚔️ 對戰進行中" : "👑 主持房間中";
      oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0";
    }

    if (lobbyCountEl) {
      lobbyCountEl.textContent = isSpec
        ? state.matchInProgress
          ? "👁️ 觀戰中（對戰進行中）"
          : "👁️ 觀戰模式 · 可隨時切換參賽"
        : state.isReady
        ? "已準備完成，等待開局"
        : "請確認設定後點擊準備";
    }

    if (layerRuleSelect) layerRuleSelect.disabled = true;
    if (forcedLayerSelect) forcedLayerSelect.disabled = true;
    if (railRuleSelect) railRuleSelect.disabled = true;
    if (guestSettingsNote) guestSettingsNote.classList.remove("hidden");

    if (applyScopeBtn) {
      applyScopeBtn.textContent = isSpec ? "👁️ 進入觀戰地圖視角" : "🗺️ 關閉面板返回地圖";
    }
  }

  renderMultiplayerLobbyRoster();

  if (layerRuleSelect) layerRuleSelect.value = state.p2pLayerRule || "free";
  if (forcedLayerSelect) forcedLayerSelect.value = state.p2pForcedLayer || "vector";
  if (railRuleSelect) railRuleSelect.value = state.p2pRailRule || "free";
}

function toggleP2PReady() {
  if (!state.roomCode || state.isHost || state.role === "spectator") return;
  state.isReady = !state.isReady;
  state.nickname = document.getElementById("p2p-nickname-input")?.value.trim() || state.nickname || "玩家";
  document.getElementById("p2p-re-ready-warning")?.classList.add("hidden");
  ensureLocalPlayerInRoster();
  sendP2PMessage("SYNC_READY_STATUS", { ready: state.isReady, name: state.nickname });
  updateP2PLobbyUI();
}

function notifyP2PPlayerFinished(finalStats) {
  state.finished = true;
  state.finalStats = finalStats;
  ensureLocalPlayerInRoster();
  if (state.isHost) {
    const allDone = getActiveBattlePlayers().every((p) => p.finished);
    if (allDone) state.matchInProgress = false;
    broadcastRosterFromHost();
  }
  sendP2PMessage("SYNC_PLAYER_FINISHED", finalStats);
  updateOpponentUI();
}

function checkIfLocalIsLastPlayer() {
  if (state.role === "spectator" || state.finished || !state.matchInProgress || state.promptedLastPlayer) return;
  const otherPlayers = getActiveBattlePlayers().filter((p) => p.id !== state.localInstanceId);
  if (otherPlayers.length === 0) return;
  if (otherPlayers.every((p) => p.finished)) {
    state.promptedLastPlayer = true;
    const modal = document.getElementById("modal-opponent-finished");
    const desc = document.getElementById("opp-finish-desc");
    if (modal && desc) {
      desc.textContent = `其他所有對戰玩家（共 ${otherPlayers.length} 位）都已比你早結束了！你是最後一個還在作答的玩家，要繼續玩完嗎？`;
      modal.classList.remove("hidden");
      playTone("tier");
    }
  }
}

function handleOpponentFinished(payload, senderIdFromMsg = null) {
  if (!payload) return;
  const senderId = payload.senderId || senderIdFromMsg;
  const authCounts = getLocalGrandCounts();

  if (senderId && state.players[senderId]) {
    state.players[senderId].finished = true;
    state.players[senderId].finishReason = payload.reason || "giveup";
    state.players[senderId].finalStats = payload;
    state.players[senderId].score = payload.adminCurrent ?? payload.grandScore ?? state.players[senderId].score;
    state.players[senderId].total = authCounts.regionTotal || payload.adminTotal || state.players[senderId].total;
    state.players[senderId].stationScore = payload.unlockedStCount ?? state.players[senderId].stationScore;
    state.players[senderId].stationTotal = authCounts.stationTotal || payload.stationTotal || state.players[senderId].stationTotal;
    state.players[senderId]._viewSets = null;
  }

  syncPrimaryOpponentFromRoster();
  if (!senderId || !state.players[senderId]) {
    state.opponent.finished = true;
    state.opponent.finalStats = payload;
    state.opponent.score = payload.grandScore || payload.score || 0;
    state.opponent.total = authCounts.grandTotal || payload.grandTotal || 368;
  }

  if (state.isHost) {
    const allDone = getActiveBattlePlayers().every((p) => p.finished);
    if (allDone) {
      state.matchInProgress = false;
      broadcastRosterFromHost();
    }
  }

  updateOpponentUI();
  if (state.role === "spectator" && senderId === state.spectatingPlayerId) {
    refreshAllPolygonStyles();
    updateRoadAndRailwayTileOverlays();
    updateScoreAndProgressUI();
  }

  const oppPct = payload.grandTotal > 0 ? ((payload.grandScore / payload.grandTotal) * 100).toFixed(1) : "0.0";
  const reasonText = payload.reason === "victory" ? "100% 通關" : payload.reason === "timeout" ? "時間到" : "提早結束";

  if (state.finished) {
    showSettlementModal();
  } else if (state.role === "spectator") {
    setFeedback(`👁️ 觀戰通知：選手【${payload.name || "選手"}】已完賽（${reasonText} · ${oppPct}%）`, "tier");
  } else {
    setFeedback(`🏁 玩家【${payload.name || "對手"}】已結束（${reasonText} · ${oppPct}%）`, "info");
    if (state.aiRivalTimer || (getActiveBattlePlayers().length <= 2 && !state.matchInProgress)) {
      const modal = document.getElementById("modal-opponent-finished");
      const desc = document.getElementById("opp-finish-desc");
      if (modal && desc) {
        desc.textContent = `其他對戰玩家【${payload.name || "對手"}】已結束本局（${payload.grandScore} / ${payload.grandTotal} · ${oppPct}%），你是最後一個還在作答的玩家，要繼續玩完嗎？`;
        modal.classList.remove("hidden");
        playTone("tier");
      }
    } else {
      checkIfLocalIsLastPlayer();
    }
  }
}

function requestP2PRematch() {
  const isMultiplayer = Boolean(state.roomCode || state.aiRivalTimer || getActiveBattlePlayers().length > 1);
  if (!isMultiplayer) {
    resetGame();
    document.getElementById("modal-settlement")?.classList.add("hidden");
    return;
  }

  const rematchBtn = document.getElementById("btn-rematch-settlement");
  const rematchText = document.getElementById("rematch-btn-text");
  if (rematchBtn) rematchBtn.disabled = true;
  if (rematchText) rematchText.textContent = "⏳ 已發送重開邀請，等待同意...";

  if (state.aiRivalTimer || state.aiRivalActive) {
    setTimeout(() => {
      document.getElementById("modal-settlement")?.classList.add("hidden");
      startSynchronizedP2PCountdown(getHostSyncConfig(false), true);
    }, 600);
    return;
  }

  sendP2PMessage("REMATCH_REQUEST", { sender: state.nickname });
  setFeedback("⏳ 已發送重新對戰邀請，等待回應...", "info");
}

function handleRematchRequest(payload) {
  if (state.role === "spectator") return;
  const modal = document.getElementById("modal-rematch-confirm");
  const desc = document.getElementById("rematch-confirm-desc");
  if (modal && desc) {
    desc.textContent = `玩家【${payload?.sender || state.opponent.name || "對手"}】邀請以相同設定重新開局對戰，是否同意？`;
    modal.classList.remove("hidden");
    playTone("tier");
  }
}

function respondP2PRematch(accepted) {
  const modal = document.getElementById("modal-rematch-confirm");
  if (modal) modal.classList.add("hidden");

  sendP2PMessage(accepted ? "REMATCH_ACCEPT" : "REMATCH_DECLINE", { sender: state.nickname });

  if (accepted) {
    document.getElementById("modal-settlement")?.classList.add("hidden");
    if (state.isHost) {
      startSynchronizedP2PCountdown(getHostSyncConfig(false), true);
    }
  } else {
    setFeedback("已婉拒重新開局邀請", "info");
  }
}

function handleRematchAccepted() {
  document.getElementById("modal-settlement")?.classList.add("hidden");
  if (state.isHost) {
    startSynchronizedP2PCountdown(getHostSyncConfig(false), true);
  }
}

function handleRematchDeclined(payload) {
  const rematchBtn = document.getElementById("btn-rematch-settlement");
  const rematchText = document.getElementById("rematch-btn-text");
  if (rematchBtn) rematchBtn.disabled = false;
  if (rematchText) rematchText.textContent = "發起重開對戰";
  setFeedback(`玩家【${payload?.sender || "對手"}】婉拒了重新開局邀請`, "warn");
}

function requestReturnToLobby() {
  const isMultiplayer = Boolean(state.roomCode || state.aiRivalTimer || state.aiRivalActive || getActiveBattlePlayers().length > 1);

  if (!isMultiplayer) {
    resetGame();
    document.getElementById("modal-settlement")?.classList.add("hidden");
    if (typeof openGameHubModal === "function") openGameHubModal();
    return;
  }

  const returnBtn = document.getElementById("btn-return-lobby-settlement");
  const returnText = document.getElementById("return-lobby-btn-text");
  if (returnBtn) returnBtn.disabled = true;
  if (returnText) returnText.textContent = "⏳ 返回大廳中...";

  if (state.aiRivalTimer || state.aiRivalActive) {
    executeReturnToLobby();
    return;
  }

  if (state.isHost) {
    executeReturnToLobby();
  } else {
    sendP2PMessage("RETURN_TO_LOBBY_REQUEST", { sender: state.nickname });
    setFeedback("⏳ 已向房主發送回到大廳重新設定請求...", "info");
  }
}

function executeReturnToLobby() {
  state.matchInProgress = false;
  state.finished = false;
  state.isGameOver = false;

  resetGame();

  getParticipantList().forEach((p) => {
    p.finished = false;
    p.finishReason = null;
    p.finalStats = null;
    p.score = 0;
    p.stationScore = 0;
    p.unlockedTowns = [];
    p.unlockedCounties = [];
    p.unlockedProvinces = [];
    p.missedTowns = [];
    p.unlockedStations = [];
    p.missedStations = [];
    p._viewSets = null;
    p.isReady = false;
  });

  state.isReady = false;
  if (state.opponent) {
    state.opponent.isReady = false;
    state.opponent.finished = false;
    state.opponent.finalStats = null;
    state.opponent.score = 0;
    state.opponent.stationScore = 0;
  }

  if (state.isHost) {
    sendP2PMessage("RETURN_TO_LOBBY", { sender: state.nickname });
    broadcastRosterFromHost();
  }

  document.getElementById("modal-settlement")?.classList.add("hidden");
  document.getElementById("modal-opponent-finished")?.classList.add("hidden");
  document.getElementById("modal-rematch-confirm")?.classList.add("hidden");
  document.getElementById("btn-reopen-settlement")?.classList.add("hidden");

  const returnBtn = document.getElementById("btn-return-lobby-settlement");
  const returnText = document.getElementById("return-lobby-btn-text");
  if (returnBtn) returnBtn.disabled = false;
  if (returnText) returnText.textContent = "回到房間重新設定";

  updateP2PLobbyUI();
  updateOpponentUI();
  if (typeof openGameHubModal === "function") {
    openGameHubModal();
  }

  setFeedback("🔄 全體回到大廳，準備狀態已歸零，可重新調整比賽設定！", "tier");
  playTone("tier");
}

// ============================================================================
// P2P INITIALIZATION, ROOM HOSTING & ROOM JOINING
// ============================================================================
function initP2PEngine() {
  const nickInput = document.getElementById("p2p-nickname-input");
  if (nickInput && state.nickname) nickInput.value = state.nickname;

  try {
    state.bcChannel = new BroadcastChannel("taiwan_geomaster_p2p_sync");
    state.bcChannel.onmessage = (ev) => {
      if (ev.data) dispatchP2PMessage(ev.data);
    };
  } catch (e) {}

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const urlRoom = (params.get("room") || hashParams.get("room") || hashParams.get("p2p") || "").trim().toUpperCase();
  const urlMode = (params.get("mode") || hashParams.get("mode") || params.get("role") || "").trim().toLowerCase();

  const savedSession = loadSavedSessionFromStorage();

  // Case A: Opened via a Room Link (?room=XXXXXX)
  if (urlRoom) {
    const roomInput = document.getElementById("p2p-room-code-input");
    if (roomInput) roomInput.value = urlRoom;

    // Check if this Device ID already has an active session in this exact room!
    if (savedSession && savedSession.roomCode === urlRoom) {
      openGameHubModal(savedSession.isHost ? "host" : "join");
      resumeSavedRoomSession(savedSession);
      return;
    }

    // Issue 3 & 6: Opening someone else's room link defaults to Spectator mode unless ?mode=player is explicitly used
    const joinAsSpectator = urlMode !== "player" && urlMode !== "play" && urlMode !== "client";
    const chkSpec = document.getElementById("chk-p2p-join-spectate");
    if (chkSpec) chkSpec.checked = joinAsSpectator;

    openGameHubModal("join");
    joinP2PRoom(urlRoom, {
      preferredRole: joinAsSpectator ? "spectator" : "player",
      isAutoUrlJoin: true
    });
    return;
  }

  // Case B: Normal Entry (No ?room= in URL) -> Open Unified Entry Hub in Solo Mode!
  // Never auto-connect as a mysterious client!
  state.roomCode = "";
  state.isHost = false;
  state.role = "solo";
  state.opponent.connected = false;

  if (savedSession && savedSession.roomCode) {
    const banner = document.getElementById("session-restore-banner");
    const txt = document.getElementById("session-restore-text");
    if (banner && txt) {
      const roleName = savedSession.isHost ? "👑 房主" : savedSession.role === "spectator" ? "👁️ 觀戰者" : "🎮 參賽選手";
      txt.textContent = `偵測到您的裝置 (${state.deviceId.slice(0, 10)}) 在房間【${savedSession.roomCode}】有未結束紀錄（身分：${roleName}），可一鍵重連恢復 Session！`;
      banner.classList.remove("hidden");
    }
  }

  openGameHubModal("solo");
  updateP2PLobbyUI();
}

function hostP2PRoom(existingCode = "", existingPassword = null, restoredPlayers = null) {
  const code = existingCode || "TW" + Math.random().toString(36).substring(2, 6).toUpperCase();
  const hostPassInput = document.getElementById("p2p-host-password-input");
  const pwd =
    existingPassword !== null
      ? existingPassword
      : (hostPassInput?.value.trim() || document.getElementById("p2p-password-input")?.value.trim() || "");
  if (hostPassInput && pwd) hostPassInput.value = pwd;

  state.roomCode = code;
  state.roomPassword = pwd;
  state.isHost = true;
  state.role = "host";
  state.hubEntryTab = "host";
  state.spectatingPlayerId = null;
  state.pendingConfigProposal = null;
  state.matchInProgress = false;
  state.promptedLastPlayer = false;
  state.isReady = true;
  state.peers = new Map();
  state.players = restoredPlayers && typeof restoredPlayers === "object" ? restoredPlayers : {};
  state.opponent.connected = false;
  state.opponent.isReady = false;
  state.opponent.name = "對手";

  ensureLocalPlayerInRoster();

  const lrule = document.getElementById("p2p-layer-rule-select")?.value || "free";
  const flayer = document.getElementById("p2p-forced-layer-select")?.value || "vector";
  const rrule = document.getElementById("p2p-rail-rule-select")?.value || "free";
  applyP2PLayerRule(lrule, flayer, rrule);

  const roomInput = document.getElementById("p2p-room-code-input");
  if (roomInput) roomInput.value = code;
  const roomTag = document.getElementById("p2p-room-tag");
  if (roomTag) roomTag.textContent = `房號: ${code} (Host${pwd ? " 🔒" : ""})`;
  const dot = document.getElementById("p2p-status-dot");
  if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-ping";

  const statusEl = document.getElementById("p2p-modal-status");
  if (statusEl) {
    statusEl.textContent = `已建立房間 ${code}${pwd ? "（已設密碼保護）" : ""}！可複製下方「觀戰連結」或「參賽連結」邀請好友`;
  }

  updateP2PPanelVisibility();
  updateP2PLobbyUI();
  updateOpponentUI();

  try {
    if (typeof Peer !== "undefined") {
      if (state.peer) state.peer.destroy();
      state.peer = new Peer(`tw-geomaster-${code}`);
      state.peer.on("connection", (conn) => {
        setupPeerConnectionHandlers(conn);
      });
    }
  } catch (e) {}
}

function joinP2PRoom(codeInput, opts = {}) {
  const code = (codeInput || document.getElementById("p2p-room-code-input")?.value || "").trim().toUpperCase();
  if (!code) {
    setFeedback("⚠️ 請先輸入 6 碼房間代碼！", "warn");
    return;
  }
  const pwd =
    opts.password !== undefined
      ? opts.password
      : document.getElementById("p2p-password-input")?.value.trim() || "";
  const chkSpec = document.getElementById("chk-p2p-join-spectate");
  const wantSpectate =
    opts.preferredRole !== undefined
      ? opts.preferredRole === "spectator"
      : chkSpec
      ? Boolean(chkSpec.checked)
      : true;

  state.roomCode = code;
  state.roomPassword = pwd;
  state.isHost = false;
  state.role = wantSpectate ? "spectator" : "player";
  state.hubEntryTab = "join";
  state.isReady = false;
  state.promptedLastPlayer = false;
  state.spectatorLayerInitialized = false;
  state.players = {};
  // Do NOT set state.opponent.connected = true until LOBBY_WELCOME arrives!
  state.opponent.connected = false;

  const roomTag = document.getElementById("p2p-room-tag");
  if (roomTag) roomTag.textContent = `房號: ${code} (連線中...)`;
  const dot = document.getElementById("p2p-status-dot");
  if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
  const statusEl = document.getElementById("p2p-modal-status");
  if (statusEl) {
    statusEl.textContent = `正在以「${wantSpectate ? "👁️ 觀戰模式" : "🎮 參賽選手"}」連線至房間 ${code}...`;
  }

  updateP2PPanelVisibility();
  updateP2PLobbyUI();

  state.nickname = document.getElementById("p2p-nickname-input")?.value.trim() || state.nickname || "玩家";

  const joinPayload = {
    name: state.nickname,
    deviceId: state.deviceId,
    password: pwd,
    wantSpectate,
    isReconnect: Boolean(opts.isReconnect)
  };

  try {
    if (typeof Peer !== "undefined") {
      if (state.peer) state.peer.destroy();
      state.peer = new Peer();
      state.peer.on("open", () => {
        const conn = state.peer.connect(`tw-geomaster-${code}`);
        state.conn = conn;
        setupPeerConnectionHandlers(conn, joinPayload);
      });
    }
  } catch (e) {}

  // Also broadcast on local BroadcastChannel for same-browser multi-tab testing
  sendP2PMessage("LOBBY_JOIN", joinPayload);
}

function setupPeerConnectionHandlers(conn, customJoinPayload = null) {
  conn.on("open", () => {
    state.nickname = document.getElementById("p2p-nickname-input")?.value.trim() || state.nickname || "玩家";
    if (!state.isHost) {
      const pwd = document.getElementById("p2p-password-input")?.value.trim() || state.roomPassword || "";
      const wantSpectate = state.role === "spectator";
      const payload = customJoinPayload || {
        name: state.nickname,
        deviceId: state.deviceId,
        password: pwd,
        wantSpectate
      };
      try {
        conn.send({
          type: "LOBBY_JOIN",
          payload,
          roomCode: state.roomCode || "",
          senderId: state.localInstanceId
        });
      } catch (e) {}
    }
    updateP2PLobbyUI();
  });

  conn.on("data", (msg) => {
    dispatchP2PMessage(msg, conn);
  });

  conn.on("close", () => {
    if (state.isHost && state.peers) {
      for (const [sid, c] of state.peers.entries()) {
        if (c === conn) {
          state.peers.delete(sid);
          if (state.players[sid]) {
            // Preserve player session by Device ID so reconnecting restores their role and progress!
            state.players[sid].disconnected = true;
            state.players[sid].disconnectedAt = Date.now();
            setFeedback(`🔌 成員【${state.players[sid].name}】連線中斷，已保留其裝置 Session 供重連恢復`, "warn");
          }
        }
      }
      syncPrimaryOpponentFromRoster();
      broadcastRosterFromHost();
      updateP2PLobbyUI();
      updateOpponentUI();
      checkIfLocalIsLastPlayer();
    }
  });
}

// ============================================================================
// REAL-TIME STATE BROADCAST & LIVE LEADERBOARD (Supports >2 Players & Spectating)
// ============================================================================
function broadcastP2PState(lastItemName) {
  if (!state.roomCode && !state.aiRivalActive) return;
  if (state.role === "spectator") return;

  const counts = getLocalGrandCounts();
  ensureLocalPlayerInRoster();

  const payload = {
    senderId: state.localInstanceId,
    deviceId: state.deviceId,
    name: document.getElementById("p2p-nickname-input")?.value.trim() || state.nickname || "玩家",
    role: state.isHost ? "host" : "player",
    score: counts.regionCurrent,
    total: counts.regionTotal,
    stationScore: counts.stationCurrent,
    stationTotal: counts.stationTotal,
    macroProgress: counts.macroProgress,
    finished: Boolean(state.finished),
    finishReason: state.finalStats?.reason || null,
    elapsedSec: state.elapsedSec,
    lastItemName: lastItemName || "",
    unlockedTowns: Array.from(state.unlockedTowns),
    unlockedCounties: Array.from(state.unlockedCounties),
    unlockedProvinces: Array.from(state.unlockedProvinces),
    missedTowns: Array.from(state.missedTowns),
    unlockedStations: Array.from(state.unlockedStations),
    missedStations: Array.from(state.missedStations),
    targetId: state.targetId || null,
    targetStationKey: state.targetStationKey || null,
    stats: { ...state.stats }
  };

  sendP2PMessage("SYNC_STATE", payload);
  updateOpponentUI();
}

function handleIncomingP2PData(payload, senderIdFromMsg = null) {
  if (!payload || (!state.roomCode && !state.aiRivalActive)) return;
  const sid = payload.senderId || senderIdFromMsg;
  if (sid && sid === state.localInstanceId) return;

  const authCounts = getLocalGrandCounts();

  if (sid) {
    const existing = state.players[sid] || { id: sid, role: payload.role || "player" };
    // Authoritative score validation from unlocked sets if provided
    const uTowns = Array.isArray(payload.unlockedTowns) ? payload.unlockedTowns : existing.unlockedTowns || [];
    const uCounties = Array.isArray(payload.unlockedCounties) ? payload.unlockedCounties : existing.unlockedCounties || [];
    const uStations = Array.isArray(payload.unlockedStations) ? payload.unlockedStations : existing.unlockedStations || [];

    const verifiedScore =
      Array.isArray(payload.unlockedTowns) || Array.isArray(payload.unlockedCounties)
        ? state.difficulty === "county_only"
          ? uCounties.filter((c) => state.selectedCounties.has(c)).length
          : uTowns.filter((id) => {
              const t = ALL_TOWNS.find((x) => x.id === id);
              return t && state.selectedCounties.has(t.countyName);
            }).length
        : payload.score || 0;

    state.players[sid] = {
      ...existing,
      id: sid,
      deviceId: payload.deviceId || existing.deviceId || sid,
      name: payload.name || existing.name || "對手",
      role: payload.role || existing.role || "player",
      disconnected: false,
      score: verifiedScore,
      total: authCounts.regionTotal,
      stationScore: Array.isArray(payload.unlockedStations) ? uStations.length : payload.stationScore || 0,
      stationTotal: authCounts.stationTotal,
      macroProgress: payload.macroProgress || existing.macroProgress || {},
      finished: Boolean(payload.finished || existing.finished),
      finishReason: payload.finishReason || existing.finishReason || null,
      unlockedTowns: uTowns,
      unlockedCounties: uCounties,
      unlockedProvinces: Array.isArray(payload.unlockedProvinces) ? payload.unlockedProvinces : existing.unlockedProvinces || [],
      missedTowns: Array.isArray(payload.missedTowns) ? payload.missedTowns : existing.missedTowns || [],
      unlockedStations: uStations,
      missedStations: Array.isArray(payload.missedStations) ? payload.missedStations : existing.missedStations || [],
      targetId: payload.targetId !== undefined ? payload.targetId : existing.targetId || null,
      targetStationKey: payload.targetStationKey !== undefined ? payload.targetStationKey : existing.targetStationKey || null,
      elapsedSec: payload.elapsedSec ?? existing.elapsedSec ?? 0,
      stats: payload.stats || existing.stats || null,
      _viewSets: null
    };
  }

  syncPrimaryOpponentFromRoster();
  updateP2PPanelVisibility();
  updateOpponentUI();

  // If local user is spectating this player, live-refresh map polygons, stations, labels & dashboard!
  if ((state.role === "spectator" || state.finished) && sid === state.spectatingPlayerId) {
    refreshAllPolygonStyles();
    updateRoadAndRailwayTileOverlays();
    renderSmartLabelsAndLeaderLines();
    updateScoreAndProgressUI();
    updateTargetBannerUI();
  }
}

function updateOpponentUI() {
  if (!state.roomCode && !state.aiRivalActive) return;
  ensureLocalPlayerInRoster();

  const vState = typeof getActiveViewState === "function" ? getActiveViewState() : state;
  const watchedPlayer = vState.spectatingPlayer || state.players[state.localInstanceId];

  // Update Left Card in #p2p-live-panel (Me or Currently Watched Player)
  const localNameEl = document.getElementById("local-player-name");
  const localScoreEl = document.getElementById("local-p2p-score");
  const localPctEl = document.getElementById("local-p2p-pct");
  const localBarEl = document.getElementById("local-p2p-bar");

  const counts = getLocalGrandCounts();
  let leftCur = counts.grandCurrent;
  let leftTot = counts.grandTotal;
  if (vState.spectatingPlayer) {
    leftCur = (watchedPlayer.score || 0) + (watchedPlayer.stationScore || 0);
    leftTot = (watchedPlayer.total || 0) + (watchedPlayer.stationTotal || 0);
    if (localNameEl) localNameEl.textContent = `👁️ ${watchedPlayer.name}`;
  } else {
    if (localNameEl) localNameEl.textContent = `${state.nickname || "我方"} (我)`;
  }
  const leftPct = leftTot > 0 ? ((leftCur / leftTot) * 100).toFixed(1) : "0.0";
  if (localScoreEl) localScoreEl.textContent = `${leftCur} / ${leftTot}`;
  if (localPctEl) localPctEl.textContent = `${leftPct}%`;
  if (localBarEl) localBarEl.style.width = `${Math.min(100, parseFloat(leftPct))}%`;

  // Update Right Card in #p2p-live-panel (Leading Opponent)
  const regionScore = state.opponent.score || 0;
  const regionTotal = state.opponent.total || 0;
  const stScore = state.opponent.stationScore || 0;
  const stTotal = state.opponent.stationTotal || 0;
  const grandCur = regionScore + stScore;
  const grandTot = regionTotal + stTotal;
  const grandPct = grandTot > 0 ? ((grandCur / grandTot) * 100).toFixed(1) : "0.0";

  const remoteNameEl = document.getElementById("remote-player-name");
  const remoteScoreEl = document.getElementById("remote-p2p-score");
  const remotePctEl = document.getElementById("remote-p2p-pct");
  const remoteBarEl = document.getElementById("remote-p2p-bar");
  if (remoteNameEl) remoteNameEl.textContent = state.opponent.name + (state.opponent.finished ? " (已結束)" : "");
  if (remoteScoreEl) remoteScoreEl.textContent = `${grandCur} / ${grandTot}`;
  if (remotePctEl) remotePctEl.textContent = `${grandPct}%`;
  if (remoteBarEl) remoteBarEl.style.width = `${Math.min(100, parseFloat(grandPct))}%`;

  const diff = leftCur - grandCur;
  const lastEl = document.getElementById("remote-p2p-last");
  if (lastEl) {
    if (state.opponent.finished) {
      const rText = state.opponent.finalStats?.reason === "victory" ? "👑 已100%通關" : "🏁 已提早結束";
      lastEl.textContent = `${rText} (${grandCur}/${grandTot})`;
      lastEl.className = "text-[10px] text-amber-300 font-bold truncate";
    } else if (diff > 0) {
      lastEl.textContent = `🔥 領先 ${diff} 題！`;
      lastEl.className = "text-[10px] text-emerald-400 font-bold truncate";
    } else if (diff < 0) {
      lastEl.textContent = `⚠️ 落後 ${Math.abs(diff)} 題！`;
      lastEl.className = "text-[10px] text-amber-400 font-bold truncate";
    } else {
      lastEl.textContent = `⚖️ 雙方平手勢均力敵！`;
      lastEl.className = "text-[10px] text-sky-400 font-bold truncate";
    }
  }

  // Render Multi-player Live Leaderboard & Click-to-Spectate List
  const multiList = document.getElementById("p2p-multiplayer-live-list");
  const rankTitle = document.getElementById("p2p-live-rank-title");
  const specCountEl = document.getElementById("p2p-live-spectator-count");
  const rowsContainer = document.getElementById("p2p-live-rank-rows");
  const dualCards = document.getElementById("p2p-dual-cards");

  const sorted = getSortedActiveBattlePlayers();
  const spectators = getSpectators();
  const isThreePlus = sorted.length >= 3;

  if (dualCards) {
    dualCards.classList.toggle("hidden", isThreePlus);
  }

  if (multiList && rowsContainer) {
    if (isThreePlus) {
      multiList.classList.remove("hidden");
      const canClickToSpectate = state.role === "spectator" || state.finished;
      if (rankTitle) {
        rankTitle.textContent = canClickToSpectate
          ? `⚔️ 即時戰況排行 (${sorted.length}人 · 點擊選手切換觀看地圖)`
          : `⚔️ 即時戰況排行 (${sorted.length} 人參賽)`;
      }
      if (specCountEl) {
        specCountEl.textContent = spectators.length > 0 ? `👁️ 觀戰 ${spectators.length} 人` : "";
      }

      rowsContainer.replaceChildren();
      const tplRow = document.getElementById("tpl-p2p-live-rank-row");
      sorted.forEach((p, idx) => {
        if (!tplRow || !tplRow.content) return;
        const row = tplRow.content.firstElementChild.cloneNode(true);
        const tot = (p.total || 0) + (p.stationTotal || 0);
        const cur = (p.score || 0) + (p.stationScore || 0);
        const pct = tot > 0 ? ((cur / tot) * 100).toFixed(1) : "0.0";
        const isMe = p.id === state.localInstanceId;
        const isWatched = canClickToSpectate && state.spectatingPlayerId === p.id;

        if (isWatched) {
          row.className = "p-2 rounded-xl bg-amber-500/15 border border-amber-400 space-y-1 cursor-pointer transition shadow-md";
        } else if (isMe) {
          row.className = "p-2 rounded-xl bg-slate-900/90 border border-sky-500/50 space-y-1 cursor-pointer transition";
        }

        const numEl = row.querySelector(".rank-num");
        const nameEl = row.querySelector(".rank-name");
        const statusEl = row.querySelector(".rank-status");
        const watchBadge = row.querySelector(".rank-watching");
        const scoreEl = row.querySelector(".rank-score");
        const barEl = row.querySelector(".rank-bar");

        if (numEl) numEl.textContent = `#${idx + 1}`;
        if (nameEl) nameEl.textContent = `${p.role === "host" ? "👑 " : ""}${p.name}${isMe ? " (我)" : ""}`;
        if (statusEl) {
          if (p.finished) {
            statusEl.className = "rank-status px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold shrink-0";
            statusEl.textContent = p.finishReason === "victory" ? "👑 通關" : "🏁 已結束";
          } else {
            statusEl.className = "rank-status text-[9px] text-slate-400 shrink-0";
            statusEl.textContent = "作答中";
          }
        }
        if (watchBadge) watchBadge.classList.toggle("hidden", !isWatched);
        if (scoreEl) scoreEl.textContent = `${cur}/${tot} (${pct}%)`;
        if (barEl) {
          barEl.className = `rank-bar h-full ${p.finished ? "bg-amber-400" : isWatched ? "bg-emerald-400" : "bg-sky-400"} transition-all duration-300`;
          barEl.style.width = `${Math.min(100, parseFloat(pct))}%`;
        }

        row.addEventListener("click", () => {
          if (state.role === "spectator" || state.finished) {
            setSpectatingTarget(p.id);
          } else {
            setFeedback(`⚔️ 比賽進行中僅觀戰者或已完賽選手可切換觀看他人地圖！`, "info");
          }
        });
        rowsContainer.appendChild(row);
      });
    } else {
      multiList.classList.add("hidden");
    }
  }

  updateSpectatorPlayerSelectUI();

  // Macro Progress Bars (Using <template id="tpl-p2p-macro-bar">)
  const compWrap = document.getElementById("p2p-macro-bars-container");
  const barsEl = document.getElementById("p2p-macro-bars");
  if (compWrap && barsEl) {
    const mp = state.opponent.macroProgress || {};
    const macroKeys = Object.keys(mp);
    if (!isThreePlus && macroKeys.length > 0) {
      compWrap.classList.remove("hidden");
      const macroLabels = {
        "地區": "🗺️ 行政區",
        "台鐵": "🚆 台鐵",
        "高鐵": "🚄 高鐵",
        "捷運": "🚇 捷運",
        "輕軌": "🚊 輕軌",
        "纜車": "🚡 纜車",
        "林鐵": "🌲 林鐵",
        "糖鐵": "🍬 糖鐵"
      };
      barsEl.replaceChildren();
      const tplMacro = document.getElementById("tpl-p2p-macro-bar");
      macroKeys.forEach((k) => {
        if (!tplMacro || !tplMacro.content) return;
        const oppData = mp[k] || { cur: 0, tot: 1 };
        const oppPct = oppData.tot > 0 ? Math.round((oppData.cur / oppData.tot) * 100) : 0;
        let myPct = 0;
        if (k === "地區") {
          myPct = leftTot > 0 ? Math.round((leftCur / Math.max(1, counts.regionTotal)) * 100) : 0;
        } else {
          const activeSt = getActiveQuizStations();
          const myStations = activeSt.filter((s) => s.macro === k);
          const myUnlocked = myStations.filter((s) => vState.unlockedStations.has(s.key)).length;
          myPct = myStations.length > 0 ? Math.round((myUnlocked / myStations.length) * 100) : 0;
        }
        const row = tplMacro.content.firstElementChild.cloneNode(true);
        const lbl = row.querySelector(".macro-label");
        const st = row.querySelector(".macro-stat");
        const myBar = row.querySelector(".macro-my-bar");
        const oppBar = row.querySelector(".macro-opp-bar");
        if (lbl) lbl.textContent = macroLabels[k] || k;
        if (st) st.textContent = `${vState.spectatingPlayer ? watchedPlayer.name : "我"} ${myPct}% vs ${state.opponent.name} ${oppPct}%`;
        if (myBar) myBar.style.width = `${Math.min(100, myPct)}%`;
        if (oppBar) oppBar.style.width = `${Math.min(100, oppPct)}%`;
        barsEl.appendChild(row);
      });
    } else {
      compWrap.classList.add("hidden");
    }
  }
}

function playCountdownBeep(freq = 440, duration = 0.14, type = "sine") {
  if (!state.soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function startSynchronizedP2PCountdown(cfg, isHost) {
  state.matchInProgress = true;
  state.promptedLastPlayer = false;
  state.spectatorLayerInitialized = false;

  getParticipantList().forEach((p) => {
    p.finished = false;
    p.finishReason = null;
    p.finalStats = null;
    p.score = 0;
    p.stationScore = 0;
    p.unlockedTowns = [];
    p.unlockedCounties = [];
    p.unlockedProvinces = [];
    p.missedTowns = [];
    p.unlockedStations = [];
    p.missedStations = [];
    p._viewSets = null;
  });

  if (isHost) {
    sendP2PMessage("SYNC_START", cfg);
    broadcastRosterFromHost();
  }

  document.getElementById("modal-scope")?.classList.add("hidden");
  document.getElementById("modal-config-vote")?.classList.add("hidden");

  if (cfg) {
    applyRemoteSyncConfig(cfg, true, true);
  } else {
    resetGame();
  }
  applySpectatorInputLock();

  const isSpec = state.role === "spectator";
  const overlay = document.getElementById("p2p-countdown-overlay");
  const badgeEl = document.getElementById("p2p-cd-badge");
  const numEl = document.getElementById("p2p-cd-number");
  const statusEl = document.getElementById("p2p-cd-status");

  if (overlay) {
    if (badgeEl) {
      badgeEl.textContent = isSpec ? "👁️ SPECTATOR MODE · 觀戰模式" : "⚔️ MULTIPLAYER BATTLE · 即時連線對戰";
    }
    if (numEl) {
      numEl.textContent = "3";
      numEl.className = "text-9xl font-black text-white tracking-tighter";
      numEl.style.textShadow = "0 0 60px rgba(56, 189, 248, 0.85)";
      numEl.style.transform = "scale(1.0)";
    }
    if (statusEl) {
      statusEl.textContent = isSpec ? "觀戰視角準備中，對戰即將開始！" : "全員已就緒，準備開局！";
      statusEl.className = "text-sm font-semibold text-slate-300 tracking-wider";
    }
    overlay.classList.remove("hidden");
  }

  playCountdownBeep(440, 0.18);

  let count = 3;
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      if (numEl) {
        numEl.textContent = String(count);
        numEl.style.transform = "scale(1.35)";
        setTimeout(() => { if (numEl) numEl.style.transform = "scale(1.0)"; }, 180);
      }
      playCountdownBeep(440, 0.18);
    } else if (count === 0) {
      if (numEl) {
        numEl.textContent = "GO!";
        numEl.className = "text-9xl font-black text-emerald-400 tracking-tight";
        numEl.style.textShadow = "0 0 70px rgba(52, 211, 153, 0.95)";
        numEl.style.transform = "scale(1.45)";
      }
      if (statusEl) {
        statusEl.textContent = isSpec ? "👁️ 對戰已開始，點擊排行可自由切換觀看任意選手地圖！" : "🔥 比賽開始！輸入第一個地名即刻進攻！";
        statusEl.className = "text-base font-bold text-emerald-300 tracking-wider";
      }
      playCountdownBeep(880, 0.35, "triangle");
    } else {
      clearInterval(interval);
      if (overlay) overlay.classList.add("hidden");
      startTimer();
      setFeedback(isSpec ? "👁️ 觀戰開始！點擊右側排行可切換選手視角" : "⚔️ 對戰正式開始！全員同步計時，衝向 100% 吧！", "tier");
      if (typeof startAiRivalLoop === "function") {
        startAiRivalLoop();
      }
      if (!isSpec) {
        const inp = document.getElementById("answer-input");
        if (inp) inp.focus({ preventScroll: true });
      }
      if (window.scrollY > 0) window.scrollTo(0, 0);
    }
  }, 1000);
}

function applyRemoteSyncConfig(cfg, fromCountdown = false, isAuthorized = false) {
  if (!cfg) return;
  if (!isAuthorized && !canLocalModifyGameConfig() && state.isHost) return;

  if (cfg.quizTargetMode) {
    state.quizTargetMode = cfg.quizTargetMode;
  }
  if (typeof cfg.showStationTerminusHints !== "undefined") {
    state.showStationTerminusHints = Boolean(cfg.showStationTerminusHints);
  }
  if (Array.isArray(cfg.selectedCounties)) {
    state.selectedCounties = new Set(cfg.selectedCounties);
  }
  if (Array.isArray(cfg.quizStationLines)) {
    state.quizStationLines = new Set(cfg.quizStationLines);
  }

  if (state.quizTargetMode === "region") {
    state.quizStationLines.clear();
    state.stationQuizEnabled = false;
  } else if (state.quizTargetMode === "station") {
    state.selectedCounties.clear();
    state.stationQuizEnabled = state.quizStationLines.size > 0;
  } else {
    state.stationQuizEnabled = state.quizStationLines.size > 0;
  }

  if (state.stationQuizEnabled && state.quizStationLines.size > 0) {
    state.selectedTransportLines = new Set(state.quizStationLines);
    if (state.transportMode === "off" && state.p2pRailRule !== "ban_rail") {
      state.transportMode = "lines_and_stations";
    }
  } else if (state.quizTargetMode === "region" && state.p2pRailRule === "free") {
    state.transportMode = "off";
  }

  if (cfg.difficulty && ["casual", "county_only", "hard_suffix", "hard_full", "master_hierarchy"].includes(cfg.difficulty)) {
    state.difficulty = cfg.difficulty;
  }
  if (cfg.playMode) {
    state.playMode = cfg.playMode;
  }
  if (cfg.timerMode) state.timerMode = cfg.timerMode;
  if (cfg.countdownTotalSec) state.countdownTotalSec = cfg.countdownTotalSec;

  const timerBtn = document.getElementById("btn-timer-mode");
  if (timerBtn) {
    timerBtn.textContent = state.timerMode === "up" ? "正計時" : `倒數 ${Math.round(state.countdownTotalSec / 60)}m`;
  }

  updateModeBadgeText();

  const totalTowns = getScopeTowns().length;
  const activeSt = getActiveQuizStations();
  let summaryLabel = "";
  if (state.selectedCounties.size === 0 && activeSt.length > 0) {
    summaryLabel = `純猜車站 (${state.quizStationLines.size}線·${activeSt.length}站)`;
  } else {
    const adminStr =
      state.selectedCounties.size === 22
        ? "全台 368 區"
        : state.selectedCounties.size === 1
        ? `${Array.from(state.selectedCounties)[0]} (${totalTowns}區)`
        : `自選 ${state.selectedCounties.size} 縣市 (${totalTowns}區)`;
    summaryLabel = activeSt.length > 0 ? `${adminStr} + ${activeSt.length}站` : adminStr;
  }
  const summaryEl = document.getElementById("scope-summary-label");
  if (summaryEl) summaryEl.textContent = summaryLabel;

  if (cfg.layerRule || cfg.railRule || cfg.forcedLayer) {
    state.spectatorLayerInitialized = false;
    applyP2PLayerRule(cfg.layerRule || state.p2pLayerRule, cfg.forcedLayer || state.p2pForcedLayer, cfg.railRule || state.p2pRailRule);
  }

  resetGame();
  renderScopeModalGrid();

  if (!fromCountdown && !state.isHost && state.role !== "spectator" && cfg.isSettingChange) {
    state.isReady = false;
    sendP2PMessage("SYNC_READY_STATUS", { ready: false, name: state.nickname });
    const warningBanner = document.getElementById("p2p-re-ready-warning");
    if (warningBanner) warningBanner.classList.remove("hidden");
    setFeedback(`⚠️ 房間設定已變更 (${summaryLabel})，請重新確認並點擊「準備」！`, "warn");
  }

  updateP2PLobbyUI();
}

function broadcastP2PConfig(isSettingChange = false) {
  if (!state.isHost || !state.roomCode) return;
  sendP2PMessage("SYNC_CONFIG", getHostSyncConfig(isSettingChange));
}

function onHostSettingChange(name = "") {
  if (!state.isHost || !state.roomCode) return;
  getNonHostBattlePlayers().forEach((p) => { p.isReady = false; });
  state.opponent.isReady = false;
  broadcastP2PConfig(true);
  broadcastRosterFromHost();
  updateP2PLobbyUI();
  setFeedback(`已更新${name ? `「${name}」` : "房間設定"}，已同步所有成員畫面！`, "warn");
}

function applyScopePreset(presetKey) {
  if (!canLocalModifyGameConfig()) {
    setFeedback("🔒 多人連線模式下，僅房主可發起題庫與難度變更！", "warn");
    return;
  }
  const patch = {};
  if (presetKey === "all") {
    patch.quizTargetMode = "region";
    patch.selectedCounties = TAIWAN_ADMIN_DATA.map((c) => c.name);
    patch.quizStationLines = [];
  } else if (presetKey === "six_cities") {
    patch.quizTargetMode = "region";
    patch.selectedCounties = TAIWAN_ADMIN_DATA.filter((c) => c.isSpecial).map((c) => c.name);
    patch.quizStationLines = [];
  } else if (presetKey === "north") {
    patch.quizTargetMode = "region";
    patch.selectedCounties = TAIWAN_ADMIN_DATA.filter((c) => c.region === "north").map((c) => c.name);
    patch.quizStationLines = [];
  } else if (presetKey === "central") {
    patch.quizTargetMode = "region";
    patch.selectedCounties = TAIWAN_ADMIN_DATA.filter((c) => c.region === "central").map((c) => c.name);
    patch.quizStationLines = [];
  } else if (presetKey === "south") {
    patch.quizTargetMode = "region";
    patch.selectedCounties = TAIWAN_ADMIN_DATA.filter((c) => c.region === "south").map((c) => c.name);
    patch.quizStationLines = [];
  } else if (presetKey === "east_islands") {
    patch.quizTargetMode = "region";
    patch.selectedCounties = TAIWAN_ADMIN_DATA.filter((c) => c.region === "east" || ["澎湖縣", "金門縣", "連江縣"].includes(c.name)).map((c) => c.name);
    patch.quizStationLines = [];
  } else if (presetKey === "stations_only") {
    patch.quizTargetMode = "station";
    patch.selectedCounties = [];
    patch.quizStationLines = TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway).map((l) => l.id);
  }
  requestOrApplyConfigChange(patch, "題庫範圍");
}

function toggleAiRivalSimulation() {
  const btn = document.getElementById("btn-quick-sim-rival");
  if (state.aiRivalTimer || state.aiRivalActive) {
    if (state.aiRivalTimer) clearInterval(state.aiRivalTimer);
    state.aiRivalTimer = null;
    state.aiRivalActive = false;
    if (!state.roomCode) {
      state.isHost = false;
      state.role = "solo";
      state.opponent.connected = false;
      state.opponent.isReady = false;
    }
    delete state.players["ai_rival"];
    if (btn) btn.textContent = "🤖 開啟 AI 虛擬對手陪練";
    updateP2PPanelVisibility();
    updateP2PLobbyUI();
    setFeedback("已關閉 AI 虛擬對手陪練", "info");
    return;
  }

  const scopeTowns = getScopeTowns();
  state.isHost = true;
  state.role = "host";
  state.aiRivalActive = true;
  state.opponent.name = "🤖 AI 對手";
  state.opponent.connected = true;
  state.opponent.isReady = true;
  state.opponent.finished = false;
  state.opponent.score = 0;
  state.opponent.total = state.difficulty === "county_only" ? getScopeCounties().length : scopeTowns.length;
  state.opponent.stationScore = 0;
  state.opponent.stationTotal = getActiveQuizStations().length;
  state.opponent.macroProgress = { "地區": { cur: 0, tot: state.opponent.total } };
  state.players["ai_rival"] = {
    id: "ai_rival",
    name: "🤖 AI 對手",
    role: "player",
    isReady: true,
    disconnected: false,
    finished: false,
    score: 0,
    total: state.opponent.total,
    stationScore: 0,
    stationTotal: state.opponent.stationTotal,
    unlockedTowns: [],
    unlockedCounties: [],
    unlockedStations: []
  };
  if (btn) btn.textContent = "⏹️ 停止 AI 對手陪練";

  updateP2PPanelVisibility();
  updateP2PLobbyUI();
  updateOpponentUI();
  setFeedback("🤖 AI 虛擬對手已就緒！點擊下方「全員已準備，立即同步開局」即可開始對戰！", "tier");
}

function startAiRivalLoop() {
  if (!state.aiRivalActive) return;
  if (state.aiRivalTimer) clearInterval(state.aiRivalTimer);
  state.aiRivalTimer = setInterval(() => {
    if (state.isGameOver) {
      clearInterval(state.aiRivalTimer);
      state.aiRivalTimer = null;
      return;
    }
    if (state.opponent.score >= state.opponent.total && state.opponent.stationScore >= state.opponent.stationTotal) {
      clearInterval(state.aiRivalTimer);
      state.aiRivalTimer = null;
      const finalStats = {
        senderId: "ai_rival",
        name: "🤖 AI 對手",
        grandScore: state.opponent.score + state.opponent.stationScore,
        grandTotal: state.opponent.total + state.opponent.stationTotal,
        elapsedSec: state.elapsedSec,
        accuracy: 94,
        wrongAttempts: 4,
        reason: "victory"
      };
      handleOpponentFinished(finalStats, "ai_rival");
      return;
    }
    if (state.opponent.score < state.opponent.total) {
      state.opponent.score++;
      state.opponent.macroProgress = state.opponent.macroProgress || {};
      state.opponent.macroProgress["地區"] = { cur: state.opponent.score, tot: state.opponent.total };
    }

    const activeSt = getActiveQuizStations();
    if (activeSt.length > 0 && state.opponent.stationScore < state.opponent.stationTotal && Math.random() > 0.4) {
      state.opponent.stationScore = (state.opponent.stationScore || 0) + 1;
      const randomSt = activeSt[Math.floor(Math.random() * activeSt.length)];
      if (randomSt && randomSt.macro) {
        const totMacro = activeSt.filter((s) => s.macro === randomSt.macro).length;
        const m = state.opponent.macroProgress[randomSt.macro] || { cur: 0, tot: totMacro };
        m.cur = Math.min(m.tot, m.cur + 1);
        state.opponent.macroProgress[randomSt.macro] = m;
      }
    }
    if (state.players["ai_rival"]) {
      state.players["ai_rival"].score = state.opponent.score;
      state.players["ai_rival"].stationScore = state.opponent.stationScore;
    }
    updateOpponentUI();
  }, 3200);
}
