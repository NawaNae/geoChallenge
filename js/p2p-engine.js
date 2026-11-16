// =========================================================================
// 10. P2P WEBRTC ENGINE
// =========================================================================
function updateP2PPanelVisibility() {
  const panel = document.getElementById("p2p-live-panel");
  if (!panel) return;
  const shouldShow = state.opponent.connected || Boolean(state.aiRivalTimer) || Boolean(state.roomCode);
  if (shouldShow) {
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
}

function applyP2PLayerRule(rule, forcedLayer, railRule) {
  state.p2pLayerRule = rule || "free";
  state.p2pForcedLayer = forcedLayer || "vector";
  if (railRule) state.p2pRailRule = railRule;
  const badge = document.getElementById("layer-lock-badge");
  const switcher = document.getElementById("layer-switcher-pill");
  const railBtn = document.getElementById("btn-toggle-rail");
  const cfgBtn = document.getElementById("btn-open-transport-cfg");

  if (state.p2pLayerRule === "locked") {
    setMapBaseLayer(state.p2pForcedLayer, true);
    if (badge) badge.classList.remove("hidden");
    if (switcher) switcher.classList.add("opacity-60");
  } else {
    if (badge && state.p2pRailRule === "free") badge.classList.add("hidden");
    if (switcher) switcher.classList.remove("opacity-60");
  }

  if (state.p2pRailRule && state.p2pRailRule !== "free") {
    if (badge) {
      badge.classList.remove("hidden");
      badge.textContent =
        state.p2pRailRule === "ban_rail"
          ? "🚫 對戰已禁用(Ban)路網與車站"
          : state.p2pRailRule === "force_stations"
          ? "📍 對戰強制純車站模式"
          : "🛤️ 對戰強制開啟路網";
    }
    updateRoadAndRailwayTileOverlays();
    if (railBtn) railBtn.classList.add("opacity-60");
    if (cfgBtn && state.p2pRailRule === "ban_rail") cfgBtn.classList.add("pointer-events-none", "opacity-50");
  } else {
    if (railBtn) railBtn.classList.remove("pointer-events-none", "opacity-50", "opacity-60");
    if (cfgBtn) cfgBtn.classList.remove("pointer-events-none", "opacity-50");
  }
}

function initP2PEngine() {
  try {
    state.bcChannel = new BroadcastChannel("taiwan_geomaster_p2p_sync");
    state.bcChannel.onmessage = (ev) => {
      if (ev.data && ev.data.type === "SYNC_STATE") {
        handleIncomingP2PData(ev.data.payload);
      } else if (ev.data && ev.data.type === "SYNC_START") {
        startSynchronizedP2PCountdown(ev.data.payload, false);
      } else if (ev.data && ev.data.type === "SYNC_CONFIG") {
        applyRemoteSyncConfig(ev.data.payload);
      }
    };
  } catch (e) {}

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const urlRoom = params.get("room") || hashParams.get("room") || hashParams.get("p2p");
  const urlDiff = params.get("diff") || hashParams.get("diff");
  const urlLayerRule = params.get("lrule") || hashParams.get("lrule");
  const urlForcedLayer = params.get("flayer") || hashParams.get("flayer");

  if (urlDiff && ["casual", "county_only", "hard_full", "master_hierarchy"].includes(urlDiff)) {
    setDifficulty(urlDiff);
  }
  if (urlLayerRule === "locked" && urlForcedLayer) {
    applyP2PLayerRule("locked", urlForcedLayer);
  }

  if (urlRoom) {
    const cleanCode = urlRoom.trim().toUpperCase();
    document.getElementById("p2p-room-code-input").value = cleanCode;
    joinP2PRoom(cleanCode);
  }
}

function hostP2PRoom() {
  const code = "TW" + Math.random().toString(36).substring(2, 6).toUpperCase();
  state.roomCode = code;
  const lrule = document.getElementById("p2p-layer-rule-select").value;
  const flayer = document.getElementById("p2p-forced-layer-select").value;
  applyP2PLayerRule(lrule, flayer);

  document.getElementById("p2p-room-code-input").value = code;
  document.getElementById("p2p-room-tag").textContent = `房號: ${code} (Host)`;
  document.getElementById("p2p-status-dot").className = "w-2 h-2 rounded-full bg-emerald-400 animate-ping";

  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${code}&diff=${state.difficulty}&lrule=${lrule}&flayer=${flayer}`;
  document.getElementById("p2p-share-url").value = shareUrl;
  document.getElementById("p2p-modal-status").textContent = `已建立房間 ${code}！複製連結給對手即可連線`;
  updateP2PPanelVisibility();

  try {
    if (typeof Peer !== "undefined") {
      if (state.peer) state.peer.destroy();
      state.peer = new Peer(`tw-geomaster-${code}`);
      state.peer.on("connection", (conn) => {
        state.conn = conn;
        state.opponent.connected = true;
        updateP2PPanelVisibility();
        setupPeerConnectionHandlers(conn);
      });
    }
  } catch (e) {}
}

function joinP2PRoom(codeInput) {
  const code = (codeInput || document.getElementById("p2p-room-code-input").value || "").trim().toUpperCase();
  if (!code) return;
  state.roomCode = code;
  state.opponent.connected = true;
  document.getElementById("p2p-room-tag").textContent = `房號: ${code} (已連線)`;
  document.getElementById("p2p-status-dot").className = "w-2 h-2 rounded-full bg-emerald-400";
  document.getElementById("p2p-modal-status").textContent = `已連線至房間 ${code}！`;
  updateP2PPanelVisibility();

  try {
    if (typeof Peer !== "undefined") {
      if (state.peer) state.peer.destroy();
      state.peer = new Peer();
      state.peer.on("open", () => {
        const conn = state.peer.connect(`tw-geomaster-${code}`);
        state.conn = conn;
        setupPeerConnectionHandlers(conn);
      });
    }
  } catch (e) {}

  broadcastP2PState("加入房間");
}

function setupPeerConnectionHandlers(conn) {
  conn.on("open", () => {
    state.opponent.connected = true;
    updateP2PPanelVisibility();
    document.getElementById("p2p-modal-status").textContent = `WebRTC P2P 通道已建立！`;
    broadcastP2PState("已連線");
  });
  conn.on("data", (msg) => {
    if (msg && msg.type === "SYNC_STATE") {
      handleIncomingP2PData(msg.payload);
    } else if (msg && msg.type === "SYNC_START") {
      startSynchronizedP2PCountdown(msg.payload, false);
    } else if (msg && msg.type === "SYNC_CONFIG") {
      applyRemoteSyncConfig(msg.payload);
    }
  });
}

function broadcastP2PState(lastItemName) {
  const total =
    state.difficulty === "county_only"
      ? getScopeCounties().length
      : getScopeTowns().length;
  const current =
    state.difficulty === "county_only"
      ? Array.from(state.unlockedCounties).filter((c) => state.selectedCounties.has(c)).length
      : Array.from(state.unlockedTowns).filter((id) => {
          const t = ALL_TOWNS.find((x) => x.id === id);
          return t && state.selectedCounties.has(t.countyName);
        }).length;

  // Build macro category progress (台鐵/高鐵/捷運/輕軌/纜車/林鐵/糖鐵) — no specific names!
  const activeSt = getActiveQuizStations();
  const macroProgress = {};
  const macroKeys = ["台鐵", "高鐵", "捷運", "輕軌", "纜車", "林鐵", "糖鐵"];
  macroKeys.forEach((k) => {
    const mStations = activeSt.filter((s) => s.macro === k);
    if (mStations.length > 0) {
      const mUnlocked = mStations.filter((s) => state.unlockedStations.has(s.key)).length;
      macroProgress[k] = { cur: mUnlocked, tot: mStations.length };
    }
  });

  const stationTotal = activeSt.length;
  const stationCurrent = activeSt.filter((s) => state.unlockedStations.has(s.key)).length;

  const payload = {
    name: document.getElementById("p2p-nickname-input").value.trim() || "玩家",
    score: current,
    total,
    stationScore: stationCurrent,
    stationTotal,
    macroProgress,
    elapsedSec: state.elapsedSec
  };

  if (state.conn && state.conn.open) {
    try {
      state.conn.send({ type: "SYNC_STATE", payload });
    } catch (e) {}
  }
  if (state.bcChannel && state.roomCode) {
    try {
      state.bcChannel.postMessage({ type: "SYNC_STATE", payload });
    } catch (e) {}
  }
}

function handleIncomingP2PData(payload) {
  if (!payload) return;
  state.opponent.connected = true;
  state.opponent.name = payload.name || "對手";
  state.opponent.score = payload.score || 0;
  state.opponent.total = payload.total || 368;
  state.opponent.stationScore = payload.stationScore || 0;
  state.opponent.stationTotal = payload.stationTotal || 0;
  state.opponent.macroProgress = payload.macroProgress || {};
  updateP2PPanelVisibility();
  updateOpponentUI();
}

function updateOpponentUI() {
  // Grand total: region + station combined
  const regionScore = state.opponent.score || 0;
  const regionTotal = state.opponent.total || 0;
  const stScore = state.opponent.stationScore || 0;
  const stTotal = state.opponent.stationTotal || 0;
  const grandCur = regionScore + stScore;
  const grandTot = regionTotal + stTotal;
  const grandPct = grandTot > 0 ? ((grandCur / grandTot) * 100).toFixed(1) : "0.0";

  document.getElementById("remote-player-name").textContent = state.opponent.name;
  document.getElementById("remote-p2p-score").textContent = `${grandCur} / ${grandTot}`;
  document.getElementById("remote-p2p-pct").textContent = `${grandPct}%`;
  document.getElementById("remote-p2p-bar").style.width = `${Math.min(100, parseFloat(grandPct))}%`;

  // Calculate local player's grand score and pct for comparison
  const scopeCounties = getScopeCounties();
  const scopeTowns = getScopeTowns();
  const localRegionTotal = state.difficulty === "county_only" ? scopeCounties.length : scopeTowns.length;
  const localRegionCur = state.difficulty === "county_only"
    ? Array.from(state.unlockedCounties).filter((c) => state.selectedCounties.has(c)).length
    : Array.from(state.unlockedTowns).filter((id) => {
        const t = ALL_TOWNS.find((x) => x.id === id);
        return t && state.selectedCounties.has(t.countyName);
      }).length;
  const activeSt = getActiveQuizStations();
  const localStCur = activeSt.filter((s) => state.unlockedStations.has(s.key)).length;
  const localGrandCur = localRegionCur + localStCur;
  const diff = localGrandCur - grandCur;

  const lastEl = document.getElementById("remote-p2p-last");
  if (lastEl) {
    if (diff > 0) {
      lastEl.textContent = `🔥 我方領先 ${diff} 題！`;
      lastEl.className = "text-[10px] text-emerald-400 font-bold truncate";
    } else if (diff < 0) {
      lastEl.textContent = `⚠️ 對手領先 ${Math.abs(diff)} 題！`;
      lastEl.className = "text-[10px] text-amber-400 font-bold truncate";
    } else {
      lastEl.textContent = `⚖️ 雙方平手勢均力敵！`;
      lastEl.className = "text-[10px] text-sky-400 font-bold truncate";
    }
  }

  // Render Macro Progress comparison rows (行政區 / 台鐵 / 高鐵 / 捷運 等，防劇透抄題)
  const compWrap = document.getElementById("p2p-macro-bars-container");
  const barsEl = document.getElementById("p2p-macro-bars");
  if (compWrap && barsEl) {
    const mp = state.opponent.macroProgress || {};
    const macroKeys = Object.keys(mp);
    if (macroKeys.length > 0) {
      compWrap.classList.remove("hidden");
      const macroLabels = {
        "地區": "🗺️ 行政區",
        "台鐵": "🚆 台鐵",
        "高鐵": "🚄 高鐵",
        "捷運": "🚇 捷運",
        "輕軌": "🚋 輕軌",
        "纜車": "🚡 纜車",
        "林鐵": "🌲 林鐵",
        "糖鐵": "🍬 糖鐵"
      };
      barsEl.innerHTML = macroKeys.map((k) => {
        const oppData = mp[k] || { cur: 0, tot: 1 };
        const oppPct = oppData.tot > 0 ? Math.round((oppData.cur / oppData.tot) * 100) : 0;
        let myPct = 0;
        if (k === "地區") {
          myPct = localRegionTotal > 0 ? Math.round((localRegionCur / localRegionTotal) * 100) : 0;
        } else {
          const myStations = activeSt.filter((s) => s.macro === k);
          const myUnlocked = myStations.filter((s) => state.unlockedStations.has(s.key)).length;
          myPct = myStations.length > 0 ? Math.round((myUnlocked / myStations.length) * 100) : 0;
        }
        return `
          <div class="space-y-0.5">
            <div class="flex items-center justify-between text-[10px]">
              <span class="font-bold text-slate-300">${macroLabels[k] || k}</span>
              <span class="text-slate-400 font-mono-num">
                我 <span class="text-sky-300 font-bold">${myPct}%</span> vs 對手 <span class="text-indigo-300 font-bold">${oppPct}%</span>
              </span>
            </div>
            <div class="grid grid-cols-2 gap-1 h-1.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div class="h-full bg-sky-400 rounded-full transition-all duration-300" style="width: ${myPct}%"></div>
              <div class="h-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 rounded-full transition-all duration-300" style="width: ${oppPct}%"></div>
            </div>
          </div>
        `;
      }).join("");
    } else {
      compWrap.classList.add("hidden");
    }
  }
}

function playCountdownBeep(freq = 440, duration = 0.14, type = "sine") {
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
  if (isHost) {
    if (state.conn && state.conn.open) {
      try { state.conn.send({ type: "SYNC_START", payload: cfg }); } catch (e) {}
    }
    if (state.bcChannel && state.roomCode) {
      try { state.bcChannel.postMessage({ type: "SYNC_START", payload: cfg }); } catch (e) {}
    }
  }

  // Hide P2P modal
  const modalP2p = document.getElementById("modal-p2p");
  if (modalP2p) modalP2p.classList.add("hidden");

  if (cfg) {
    if (cfg.difficulty) setDifficulty(cfg.difficulty);
    if (Array.isArray(cfg.selectedCounties)) state.selectedCounties = new Set(cfg.selectedCounties);
    if (Array.isArray(cfg.quizStationLines)) state.quizStationLines = new Set(cfg.quizStationLines);
    if (Array.isArray(cfg.selectedLines)) state.selectedTransportLines = new Set(cfg.selectedLines);
    if (cfg.layerRule || cfg.railRule) applyP2PLayerRule(cfg.layerRule, cfg.forcedLayer, cfg.railRule);
  }
  resetGame();

  const existing = document.getElementById("p2p-countdown-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "p2p-countdown-overlay";
  overlay.className = "fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md select-none";
  overlay.innerHTML = `
    <div class="text-center space-y-4">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-widest animate-pulse">
        <span>⚔️ MULTIPLAYER BATTLE · 即時連線對戰</span>
      </div>
      <div id="p2p-cd-number" class="text-9xl font-black text-white tracking-tighter" style="text-shadow: 0 0 60px rgba(56, 189, 248, 0.85); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
        3
      </div>
      <div id="p2p-cd-status" class="text-sm font-semibold text-slate-300 tracking-wider">
        雙方已連線 · 準備開局！
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  playCountdownBeep(440, 0.18);

  let count = 3;
  const numEl = overlay.querySelector("#p2p-cd-number");
  const statusEl = overlay.querySelector("#p2p-cd-status");

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      if (numEl) {
        numEl.textContent = count;
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
        statusEl.textContent = "🔥 比賽開始！輸入第一個地名即刻進攻！";
        statusEl.className = "text-base font-bold text-emerald-300 tracking-wider";
      }
      playCountdownBeep(880, 0.35, "triangle");
    } else {
      clearInterval(interval);
      overlay.remove();
      startTimer();
      setFeedback("⚔️ 對戰正式開始！雙方同步計時，衝向 100% 吧！", "tier");
      const inp = document.getElementById("answer-input");
      if (inp) {
        inp.focus();
        inp.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, 1000);
}

function applyRemoteSyncConfig(cfg) {
  if (!cfg) return;
  if (Array.isArray(cfg.selectedCounties)) {
    state.selectedCounties = new Set(cfg.selectedCounties);
  }
  if (Array.isArray(cfg.quizStationLines)) {
    state.quizStationLines = new Set(cfg.quizStationLines);
  }
  if (Array.isArray(cfg.selectedLines)) {
    state.selectedTransportLines = new Set(cfg.selectedLines);
  }
  if (cfg.difficulty && ["casual", "county_only", "hard_full", "master_hierarchy"].includes(cfg.difficulty)) {
    state.difficulty = cfg.difficulty;
    document.querySelectorAll(".diff-btn").forEach((btn) => {
      const isCurrent = btn.getAttribute("data-diff") === cfg.difficulty;
      btn.className = isCurrent
        ? "diff-btn text-left p-2.5 rounded-xl border transition bg-sky-500/20 border-sky-400 text-white"
        : "diff-btn text-left p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/70 text-slate-300 transition";
    });
    updateModeBadgeText();
  }
  if (cfg.playMode) {
    state.playMode = cfg.playMode;
    document.querySelectorAll(".playmode-btn").forEach((btn) => {
      const isCurrent = btn.getAttribute("data-playmode") === cfg.playMode;
      btn.className = isCurrent
        ? "playmode-btn py-2.5 px-3 rounded-xl text-xs font-bold border transition bg-emerald-500/20 border-emerald-400 text-emerald-200 text-center"
        : "playmode-btn py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-center transition";
    });
    updateModeBadgeText();
  }

  if (state.quizStationLines.size > 0) {
    state.stationQuizEnabled = true;
    if (state.transportMode === "off") state.transportMode = "lines_and_stations";
  } else {
    state.stationQuizEnabled = false;
  }

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

  resetGame();
  renderScopeModalGrid();
  setFeedback(`🔄 對手已同步更新題庫範圍為「${summaryLabel}」！`, "warn");
}

function broadcastP2PConfig() {
  const payload = {
    selectedCounties: Array.from(state.selectedCounties),
    quizStationLines: Array.from(state.quizStationLines),
    selectedLines: Array.from(state.selectedTransportLines),
    difficulty: state.difficulty,
    playMode: state.playMode
  };
  if (state.conn && state.conn.open) {
    try { state.conn.send({ type: "SYNC_CONFIG", payload }); } catch (e) {}
  }
  if (state.bcChannel && state.roomCode) {
    try { state.bcChannel.postMessage({ type: "SYNC_CONFIG", payload }); } catch (e) {}
  }
}

function toggleAiRivalSimulation() {
  const btn = document.getElementById("btn-quick-sim-rival");
  if (state.aiRivalTimer) {
    clearInterval(state.aiRivalTimer);
    state.aiRivalTimer = null;
    btn.textContent = "🤖 開啟AI虛擬對手陪練";
    updateP2PPanelVisibility();
    setFeedback("已關閉 AI 虛擬對手陪練", "info");
    return;
  }

  const scopeTowns = getScopeTowns();
  state.opponent.name = "🤖 AI 對手";
  state.opponent.score = 0;
  state.opponent.total = state.difficulty === "county_only" ? getScopeCounties().length : scopeTowns.length;
  state.opponent.stationScore = 0;
  state.opponent.stationTotal = getActiveQuizStations().length;
  state.opponent.macroProgress = { "地區": { cur: 0, tot: state.opponent.total } };
  btn.textContent = "⏹️ 停止AI對手陪練";

  state.aiRivalTimer = setInterval(() => {
    if (state.isGameOver || state.opponent.score >= state.opponent.total) {
      clearInterval(state.aiRivalTimer);
      state.aiRivalTimer = null;
      return;
    }
    state.opponent.score++;
    state.opponent.macroProgress = state.opponent.macroProgress || {};
    state.opponent.macroProgress["地區"] = { cur: state.opponent.score, tot: state.opponent.total };

    const activeSt = getActiveQuizStations();
    if (activeSt.length > 0 && Math.random() > 0.4) {
      state.opponent.stationScore = (state.opponent.stationScore || 0) + 1;
      const randomSt = activeSt[Math.floor(Math.random() * activeSt.length)];
      if (randomSt && randomSt.macro) {
        const totMacro = activeSt.filter(s => s.macro === randomSt.macro).length;
        const m = state.opponent.macroProgress[randomSt.macro] || { cur: 0, tot: totMacro };
        m.cur = Math.min(m.tot, m.cur + 1);
        state.opponent.macroProgress[randomSt.macro] = m;
      }
    }
    updateOpponentUI();
  }, 3200);

  updateP2PPanelVisibility();
  updateOpponentUI();
  document.getElementById("modal-p2p").classList.add("hidden");
  setFeedback("⚔️ 已啟動 AI 虛擬對手即時競速陪練！", "tier");
}
