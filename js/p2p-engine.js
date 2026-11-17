// ================================================================
// 10. P2P WEBRTC ENGINE (Multiplayer, Password, Spectator & Sync)
// ================================================================
function isMultiplayerActive() {
  return Boolean(
    state.roomCode ||
    state.opponent.connected ||
    state.aiRivalTimer ||
    Object.keys(state.players || {}).length > 1
  );
}

function getParticipantList() {
  return Object.values(state.players || {});
}

function getActiveBattlePlayers() {
  return getParticipantList().filter((p) => p.role === "host" || p.role === "player");
}

function getNonHostBattlePlayers() {
  return getParticipantList().filter((p) => p.role === "player");
}

function getSpectators() {
  return getParticipantList().filter((p) => p.role === "spectator");
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
  const myName = (document.getElementById("p2p-nickname-input")?.value.trim()) || state.nickname || (state.isHost ? "房主" : "玩家");
  state.nickname = myName;
  const existing = state.players[state.localInstanceId] || {};
  state.players[state.localInstanceId] = {
    ...existing,
    id: state.localInstanceId,
    name: myName,
    role: state.isHost ? "host" : (state.role === "spectator" ? "spectator" : "player"),
    isReady: state.isHost ? true : Boolean(state.isReady),
    finished: Boolean(state.finished),
    finishReason: state.finalStats?.reason || existing.finishReason || null,
    score: counts.regionCurrent,
    total: counts.regionTotal,
    stationScore: counts.stationCurrent,
    stationTotal: counts.stationTotal,
    macroProgress: counts.macroProgress,
    finalStats: state.finalStats || existing.finalStats || null
  };
}

function syncPrimaryOpponentFromRoster() {
  const others = getActiveBattlePlayers().filter((p) => p.id !== state.localInstanceId);
  if (others.length === 0) {
    if (!state.aiRivalActive) {
      state.opponent.connected = false;
    }
    return;
  }
  const primary = others[0];
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

function injectP2PExtensionsUI() {
  const modal = document.getElementById("modal-p2p");
  if (modal && !document.getElementById("p2p-password-input")) {
    const roomInput = document.getElementById("p2p-room-code-input");
    if (roomInput && roomInput.parentElement) {
      const wrap = document.createElement("div");
      wrap.id = "p2p-password-wrap";
      wrap.className = "mt-2 space-y-1.5";
      wrap.innerHTML = `
        <div class="flex items-center gap-1.5">
          <input id="p2p-password-input" type="password" autocomplete="off" placeholder="房間密碼 (選填，留空為公開)" class="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400" />
          <label class="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-slate-300 cursor-pointer shrink-0">
            <input id="chk-p2p-join-spectate" type="checkbox" class="rounded bg-slate-950 border-slate-600 text-sky-500" />
            <span>先觀戰</span>
          </label>
        </div>
        <div id="p2p-role-switch-bar" class="hidden flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-700 text-[11px]">
          <span id="p2p-spectator-status-text" class="text-amber-300 font-bold">👁️ 目前為觀戰模式</span>
          <button id="btn-p2p-switch-role" type="button" class="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold transition cursor-pointer">🎮 加入對戰</button>
        </div>
      `;
      roomInput.parentElement.insertAdjacentElement("afterend", wrap);
      document.getElementById("btn-p2p-switch-role")?.addEventListener("click", () => {
        toggleSpectatorRole();
      });
    }

    const oppNameDisp = document.getElementById("p2p-opp-name-display");
    const oppCard = oppNameDisp ? oppNameDisp.closest(".space-y-2, .grid, .flex")?.parentElement : null;
    if (oppCard && !document.getElementById("p2p-multiplayer-roster")) {
      const rosterDiv = document.createElement("div");
      rosterDiv.id = "p2p-multiplayer-roster";
      rosterDiv.className = "mt-2 space-y-1.5 max-h-40 overflow-y-auto";
      oppCard.appendChild(rosterDiv);
    }
  }

  // Spectator floating banner near answer form
  const form = document.getElementById("answer-form");
  if (form && !document.getElementById("spectator-mode-banner")) {
    const banner = document.createElement("div");
    banner.id = "spectator-mode-banner";
    banner.className = "hidden mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-between gap-2";
    banner.innerHTML = `
      <span id="spectator-banner-text">👁️ 觀戰模式中：可自由縮放地圖與切換個人圖層，本局結束後即可加入對戰</span>
      <button id="btn-spectator-join-next" type="button" class="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black hover:bg-amber-300 transition shrink-0">切換參賽</button>
    `;
    form.parentElement.insertBefore(banner, form);
    document.getElementById("btn-spectator-join-next")?.addEventListener("click", () => {
      toggleSpectatorRole();
    });
  }

  // Multi-player dynamic list inside #p2p-live-panel
  const panel = document.getElementById("p2p-live-panel");
  if (panel && !document.getElementById("p2p-multiplayer-live-list")) {
    const listWrap = document.createElement("div");
    listWrap.id = "p2p-multiplayer-live-list";
    listWrap.className = "hidden mt-2 space-y-1.5";
    panel.appendChild(listWrap);
  }
}

function applySpectatorInputLock() {
  const isSpectatingMatch = state.role === "spectator" && state.matchInProgress;
  const answerInput = document.getElementById("answer-input");
  const banner = document.getElementById("spectator-mode-banner");
  const bannerText = document.getElementById("spectator-banner-text");
  const joinBtn = document.getElementById("btn-spectator-join-next");

  if (banner) {
    if (state.role === "spectator" && state.roomCode) {
      banner.classList.remove("hidden");
      if (bannerText) {
        bannerText.textContent = state.matchInProgress
          ? "👁️ 觀戰模式中（對戰進行中）：可自由縮放與切換個人圖層，下局即可加入對戰"
          : "👁️ 觀戰模式中：點擊右側「切換參賽」即可加入下一場對戰";
      }
      if (joinBtn) {
        joinBtn.disabled = state.matchInProgress;
        joinBtn.classList.toggle("opacity-50", state.matchInProgress);
        joinBtn.classList.toggle("cursor-not-allowed", state.matchInProgress);
      }
    } else {
      banner.classList.add("hidden");
    }
  }

  if (answerInput) {
    answerInput.disabled = isSpectatingMatch;
    if (isSpectatingMatch) {
      answerInput.value = "";
      answerInput.placeholder = "👁️ 觀戰模式中（對戰進行中無法作答）";
    } else if (answerInput.placeholder.includes("觀戰模式")) {
      answerInput.placeholder = "輸入行政區或車站名稱...";
    }
  }
}

function toggleSpectatorRole() {
  if (state.isHost) return;
  if (state.matchInProgress && state.role === "spectator") {
    setFeedback("⏳ 目前對戰進行中，請等待本局結束後再切換為參賽者！", "warn");
    return;
  }
  const nextRole = state.role === "spectator" ? "player" : "spectator";
  state.role = nextRole;
  state.isReady = false;
  ensureLocalPlayerInRoster();
  sendP2PMessage("SYNC_ROLE_CHANGE", {
    role: nextRole,
    name: state.nickname,
    isReady: false
  });
  applySpectatorInputLock();
  updateP2PLobbyUI();
  setFeedback(
    nextRole === "spectator" ? "👁️ 已切換為觀戰模式" : "🎮 已加入參賽者名單，請確認設定後點擊準備！",
    "info"
  );
}

function updateP2PPanelVisibility() {
  injectP2PExtensionsUI();
  const panel = document.getElementById("p2p-live-panel");
  if (!panel) return;
  const shouldShow = state.opponent.connected || Boolean(state.aiRivalTimer) || Boolean(state.roomCode);
  if (shouldShow) {
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
  applySpectatorInputLock();
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
    const hasStations = state.stationQuizEnabled && state.quizStationLines.size > 0;
    if (badge) {
      badge.classList.remove("hidden");
      badge.textContent =
        state.p2pRailRule === "ban_rail"
          ? (hasStations ? "🚫 對戰已禁用路網 (僅允許開關車站點)" : "🚫 對戰已禁用(Ban)所有路網與車站")
          : state.p2pRailRule === "ban_roads_only"
          ? "🛑 對戰已禁用公路網 (保留軌道線+車站)"
          : state.p2pRailRule === "force_rail_only"
          ? "🚄 對戰強制純軌道路網"
          : "🛤️ 對戰強制完整路網";
    }
    updateRoadAndRailwayTileOverlays();
    if (railBtn) {
      if ((state.p2pRailRule === "ban_rail" && !hasStations) || state.p2pRailRule === "force_lines" || state.p2pRailRule === "force_rail_only") {
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

function sendP2PMessage(type, payload, targetId = null) {
  const envelope = {
    type,
    payload,
    targetId: targetId || null,
    roomCode: state.roomCode || "",
    senderId: state.localInstanceId
  };

  if (state.isHost) {
    // Host fans out to all connected PeerJS clients (or specific targetId)
    if (state.peers && state.peers.size > 0) {
      state.peers.forEach((conn, peerSenderId) => {
        if (targetId && peerSenderId !== targetId) return;
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
  if (!state.isHost) return;
  ensureLocalPlayerInRoster();
  sendP2PMessage("ROOM_ROSTER", {
    players: state.players,
    matchInProgress: state.matchInProgress
  });
}

function dispatchP2PMessage(msg, sourceConn = null) {
  if (!msg || !msg.type) return;
  if (msg.senderId && msg.senderId === state.localInstanceId) return;
  if (msg.roomCode && state.roomCode && msg.roomCode !== state.roomCode) return;
  if (msg.targetId && msg.targetId !== state.localInstanceId) return;

  // Host registers senderId -> sourceConn only for non-join or after password verification
  if (state.isHost && sourceConn && msg.senderId && msg.type !== "LOBBY_JOIN") {
    state.peers.set(msg.senderId, sourceConn);
  }

  if (msg.type === "LOBBY_JOIN") {
    if (!state.isHost) return; // Only Host processes join & assigns role!
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
        } catch (e) {}
      } else {
        sendP2PMessage("JOIN_REJECTED", rejectPayload, msg.senderId);
      }
      return;
    }

    if (sourceConn && msg.senderId) state.peers.set(msg.senderId, sourceConn);
    const existing = state.players[msg.senderId];
    const assignedRole = state.matchInProgress
      ? "spectator"
      : (msg.payload?.wantSpectate ? "spectator" : (existing?.role || "player"));

    const cfg = getHostSyncConfig(false);
    const joinerCounts = { total: getLocalGrandCounts().grandTotal };
    state.players[msg.senderId] = {
      id: msg.senderId,
      name: msg.payload?.name || "玩家",
      role: assignedRole,
      isReady: false,
      finished: false,
      finishReason: null,
      score: 0,
      total: joinerCounts.total,
      stationScore: 0,
      stationTotal: 0,
      macroProgress: {},
      finalStats: null
    };

    ensureLocalPlayerInRoster();
    syncPrimaryOpponentFromRoster();

    const welcomePayload = {
      name: state.nickname || "房主",
      assignedRole,
      matchInProgress: state.matchInProgress,
      config: cfg,
      players: state.players
    };
    sendP2PMessage("LOBBY_WELCOME", welcomePayload, msg.senderId);
    broadcastRosterFromHost();
    updateP2PPanelVisibility();
    updateP2PLobbyUI();
    updateOpponentUI();

    const roleLabel = assignedRole === "spectator" ? "觀戰者" : "挑戰者";
    setFeedback(`🎮 ${roleLabel}【${state.players[msg.senderId].name}】已加入房間！`, "tier");
    playTone("tier");
  } else if (msg.type === "JOIN_REJECTED") {
    const reason = msg.payload?.reason;
    const statusEl = document.getElementById("p2p-modal-status");
    const passInput = document.getElementById("p2p-password-input");
    const modalP2p = document.getElementById("modal-p2p");
    if (modalP2p) modalP2p.classList.remove("hidden");
    const errMsg = reason === "PASSWORD_REQUIRED"
      ? "🔒 此房間設有密碼，請輸入房間密碼後再點「加入房間」"
      : "❌ 房間密碼錯誤，請重新輸入後再試！";
    if (statusEl) statusEl.textContent = errMsg;
    if (passInput) {
      passInput.classList.add("border-rose-500");
      passInput.focus();
    }
    state.roomCode = "";
    state.opponent.connected = false;
    updateP2PPanelVisibility();
    setFeedback(errMsg, "error");
    playTone("error");
  } else if (msg.type === "LOBBY_WELCOME") {
    if (state.isHost) return;
    state.role = msg.payload?.assignedRole || "player";
    state.matchInProgress = Boolean(msg.payload?.matchInProgress);
    if (msg.payload?.players) state.players = msg.payload.players;
    if (msg.payload?.config) applyRemoteSyncConfig(msg.payload.config);
    ensureLocalPlayerInRoster();
    syncPrimaryOpponentFromRoster();
    updateP2PPanelVisibility();
    updateP2PLobbyUI();
    updateOpponentUI();
    const msgText = state.role === "spectator" && state.matchInProgress
      ? `👁️ 對戰進行中，您已以「觀戰模式」進入房間 ${state.roomCode}！`
      : `已成功加入房主【${msg.payload?.name || "房主"}】的房間！請確認設定後點擊準備`;
    const statusEl = document.getElementById("p2p-modal-status");
    if (statusEl) statusEl.textContent = msgText;
    setFeedback(msgText, "info");
    playTone("unlock");
  } else if (msg.type === "ROOM_ROSTER") {
    if (state.isHost) return;
    if (msg.payload?.players) {
      state.players = msg.payload.players;
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
    checkIfLocalIsLastPlayer();
  } else if (msg.type === "SYNC_ROLE_CHANGE") {
    if (!state.isHost) return;
    const p = state.players[msg.senderId];
    if (!p) return;
    if (state.matchInProgress && msg.payload?.role === "player") return;
    p.role = msg.payload?.role === "spectator" ? "spectator" : "player";
    p.isReady = false;
    if (msg.payload?.name) p.name = msg.payload.name;
    broadcastRosterFromHost();
    updateP2PLobbyUI();
    updateOpponentUI();
  } else if (msg.type === "SYNC_STATE") {
    handleIncomingP2PData(msg.payload, msg.senderId);
    if (state.isHost) {
      // Relay to other clients so everyone sees live multiplayer progress
      sendP2PMessage("SYNC_STATE", { ...msg.payload, senderId: msg.senderId });
    }
  } else if (msg.type === "SYNC_START") {
    if (state.isHost) return;
    startSynchronizedP2PCountdown(msg.payload, false);
  } else if (msg.type === "SYNC_CONFIG") {
    if (state.isHost) return;
    applyRemoteSyncConfig(msg.payload);
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
      sendP2PMessage("SYNC_PLAYER_FINISHED", { ...msg.payload, senderId: msg.senderId });
      broadcastRosterFromHost();
    }
  } else if (msg.type === "REMATCH_REQUEST") {
    handleRematchRequest(msg.payload);
  } else if (msg.type === "REMATCH_ACCEPT") {
    handleRematchAccepted();
  } else if (msg.type === "REMATCH_DECLINE") {
    handleRematchDeclined();
  }
}

function renderMultiplayerLobbyRoster() {
  const rosterDiv = document.getElementById("p2p-multiplayer-roster");
  if (!rosterDiv) return;
  const list = getParticipantList();
  if (list.length <= 1 && !state.aiRivalActive) {
    rosterDiv.innerHTML = "";
    return;
  }

  rosterDiv.innerHTML = `
    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">房間成員 (${list.length} 人)</div>
    <div class="space-y-1">
      ${list.map((p) => {
        const isMe = p.id === state.localInstanceId;
        const badge = p.role === "host"
          ? `<span class="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">👑 房主</span>`
          : p.role === "spectator"
          ? `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">👁️ 觀戰</span>`
          : p.isReady
          ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">✓ 已準備</span>`
          : `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold">⏳ 準備中</span>`;
        return `
          <div class="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
            <span class="font-bold text-white truncate max-w-[140px]">${p.name}${isMe ? " (你)" : ""}</span>
            ${badge}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function updateP2PLobbyUI() {
  injectP2PExtensionsUI();
  ensureLocalPlayerInRoster();

  const myName = (document.getElementById("p2p-nickname-input")?.value.trim()) || state.nickname || "我方玩家";
  state.nickname = myName;

  const roleIndicator = document.getElementById("p2p-role-indicator");
  const myAvatar = document.getElementById("p2p-my-avatar");
  const myNameDisp = document.getElementById("p2p-my-name-display");
  const myRoleBadge = document.getElementById("p2p-my-role-badge");
  const myReadyBadge = document.getElementById("p2p-my-ready-badge");
  const myReadyBtn = document.getElementById("btn-p2p-toggle-ready");

  const oppNameDisp = document.getElementById("p2p-opp-name-display");
  const oppRoleBadge = document.getElementById("p2p-opp-role-badge");
  const oppReadyBadge = document.getElementById("p2p-opp-ready-badge");
  const oppAvatar = document.getElementById("p2p-opp-avatar");
  const lobbyCountEl = document.getElementById("p2p-lobby-count");
  const startBtn = document.getElementById("btn-p2p-sync-start");
  const warningBanner = document.getElementById("p2p-re-ready-warning");

  const layerRuleSelect = document.getElementById("p2p-layer-rule-select");
  const forcedLayerSelect = document.getElementById("p2p-forced-layer-select");
  const railRuleSelect = document.getElementById("p2p-rail-rule-select");
  const guestSettingsNote = document.getElementById("p2p-guest-settings-note");

  const hostSettingsContainer = document.getElementById("p2p-host-settings");
  const guestSettingsContainer = document.getElementById("p2p-guest-settings");
  const roleSwitchBar = document.getElementById("p2p-role-switch-bar");
  const roleSwitchBtn = document.getElementById("btn-p2p-switch-role");
  const specStatusText = document.getElementById("p2p-spectator-status-text");

  if (myNameDisp) myNameDisp.textContent = myName;

  const nonHostPlayers = getNonHostBattlePlayers();
  const spectators = getSpectators();
  const allNonHostReady = (nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.isReady)) ||
    (state.aiRivalActive && state.opponent.isReady);

  if (state.isHost) {
    if (roleSwitchBar) roleSwitchBar.classList.add("hidden");
    if (roleIndicator) {
      roleIndicator.textContent = "👑 房主主控台";
      roleIndicator.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30";
    }
    if (myAvatar) myAvatar.textContent = "👑";
    if (myRoleBadge) {
      myRoleBadge.textContent = "👑 房主 (Host)";
      myRoleBadge.className = "text-[10px] font-bold text-sky-400";
    }
    if (myReadyBadge) {
      myReadyBadge.textContent = "👑 房主就緒 (免準備)";
      myReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0";
    }
    if (myReadyBtn) myReadyBtn.classList.add("hidden");
    if (warningBanner) warningBanner.classList.add("hidden");

    const readyCount = nonHostPlayers.filter((p) => p.isReady).length;
    const hasOpponents = nonHostPlayers.length > 0 || state.aiRivalActive;

    if (oppAvatar) oppAvatar.textContent = hasOpponents ? "👥" : "⏳";
    if (oppNameDisp) {
      if (state.aiRivalActive) oppNameDisp.textContent = state.opponent.name;
      else if (nonHostPlayers.length === 1) oppNameDisp.textContent = nonHostPlayers[0].name;
      else if (nonHostPlayers.length > 1) oppNameDisp.textContent = `${nonHostPlayers.length} 位參賽者`;
      else oppNameDisp.textContent = "等待玩家加入...";
    }
    if (oppRoleBadge) {
      oppRoleBadge.textContent = spectators.length > 0 ? `🎮 參賽者 · 👁️ 觀戰 ${spectators.length} 人` : (hasOpponents ? "🎮 參賽者" : "⚪ 未連線");
    }
    if (oppReadyBadge) {
      if (!hasOpponents) {
        oppReadyBadge.textContent = "⏳ 等待加入";
        oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700 shrink-0";
      } else if (allNonHostReady) {
        oppReadyBadge.textContent = `✓ 全員已準備 (${state.aiRivalActive ? 1 : readyCount}/${state.aiRivalActive ? 1 : nonHostPlayers.length})`;
        oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse shrink-0";
      } else {
        oppReadyBadge.textContent = `⏳ 準備中 (${readyCount}/${nonHostPlayers.length})`;
        oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0";
      }
    }

    if (lobbyCountEl) {
      if (!hasOpponents) lobbyCountEl.textContent = "等待玩家加入";
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
        startBtn.innerHTML = `<span>🚀</span><span>全員已準備，立即開局！</span>`;
        startBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center justify-center gap-2";
      } else if (!hasOpponents) {
        startBtn.disabled = true;
        startBtn.innerHTML = `<span>⏳</span><span>等待玩家加入房間...</span>`;
        startBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-slate-800 text-slate-500 font-black text-sm transition cursor-not-allowed border border-slate-700 flex items-center justify-center gap-2";
      } else {
        startBtn.disabled = true;
        startBtn.innerHTML = `<span>⏳</span><span>等待所有玩家準備 (${readyCount}/${nonHostPlayers.length})...</span>`;
        startBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-slate-800 text-amber-300/90 font-black text-sm transition cursor-not-allowed border border-amber-500/30 flex items-center justify-center gap-2";
      }
    }

    if (hostSettingsContainer) hostSettingsContainer.classList.remove("hidden");
    if (guestSettingsContainer) guestSettingsContainer.classList.add("hidden");
    renderP2PHostSettingsUI();
  } else {
    // Guest / Spectator view
    const isSpec = state.role === "spectator";
    if (roleSwitchBar && state.roomCode) {
      roleSwitchBar.classList.remove("hidden");
      if (specStatusText) {
        specStatusText.textContent = isSpec ? "👁️ 目前為觀戰模式 (免準備)" : "🎮 目前為參賽者";
      }
      if (roleSwitchBtn) {
        roleSwitchBtn.textContent = isSpec ? "🎮 加入對戰" : "👁️ 切換觀戰";
        roleSwitchBtn.disabled = state.matchInProgress && isSpec;
      }
    }

    if (roleIndicator) {
      roleIndicator.textContent = isSpec ? "👁️ 觀戰模式中" : "🎮 挑戰者連線中";
      roleIndicator.className = isSpec
        ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30"
        : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    }
    if (myAvatar) myAvatar.textContent = isSpec ? "👁️" : "👤";
    if (myRoleBadge) {
      myRoleBadge.textContent = isSpec ? "👁️ 觀戰者 (Spectator)" : "🎮 挑戰者 (Player)";
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
          myReadyBtn.innerHTML = `<span>✅</span><span>已準備完成！等待房主開局 (點擊取消)</span>`;
          myReadyBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-black text-sm transition cursor-pointer flex items-center justify-center gap-2";
        } else {
          myReadyBtn.innerHTML = `<i data-lucide="zap" class="w-4 h-4"></i><span>⚡ 我已確認右側設定，點擊準備 (Ready)</span>`;
          myReadyBtn.className = "w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition cursor-pointer animate-pulse flex items-center justify-center gap-2";
        }
      }
    }

    if (startBtn) startBtn.classList.add("hidden");

    const hostPlayer = getParticipantList().find((p) => p.role === "host");
    if (oppAvatar) oppAvatar.textContent = "👑";
    if (oppNameDisp) {
      oppNameDisp.textContent = hostPlayer?.name || state.opponent.name || "房主";
      oppNameDisp.className = "font-extrabold text-white text-xs truncate max-w-[130px]";
    }
    if (oppRoleBadge) {
      oppRoleBadge.textContent = "👑 房主 (Host)";
      oppRoleBadge.className = "text-[10px] font-bold text-sky-400";
    }
    if (oppReadyBadge) {
      oppReadyBadge.textContent = state.matchInProgress ? "⚔️ 對戰進行中" : "👑 房主辦中";
      oppReadyBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0";
    }

    if (lobbyCountEl) {
      lobbyCountEl.textContent = isSpec
        ? (state.matchInProgress ? "觀戰中（對戰進行中）" : "觀戰模式 · 等待開局")
        : (state.isReady ? "已準備完成，等待開局" : "請確認設定後點擊準備");
    }

    if (layerRuleSelect) layerRuleSelect.disabled = true;
    if (forcedLayerSelect) forcedLayerSelect.disabled = true;
    if (railRuleSelect) railRuleSelect.disabled = true;
    if (guestSettingsNote) guestSettingsNote.classList.remove("hidden");

    if (hostSettingsContainer) hostSettingsContainer.classList.add("hidden");
    if (guestSettingsContainer) guestSettingsContainer.classList.remove("hidden");
    renderP2PGuestSettingsPreview();
  }

  renderMultiplayerLobbyRoster();

  if (layerRuleSelect) layerRuleSelect.value = state.p2pLayerRule || "free";
  if (forcedLayerSelect) forcedLayerSelect.value = state.p2pForcedLayer || "vector";
  if (railRuleSelect) railRuleSelect.value = state.p2pRailRule || "free";

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function renderP2PHostSettingsUI() {
  const qm = state.quizTargetMode || "region";
  document.querySelectorAll(".p2p-qmode-btn").forEach((btn) => {
    const isCur = btn.getAttribute("data-p2pqmode") === qm;
    btn.className = isCur
      ? "p2p-qmode-btn p-2 rounded-xl border transition bg-sky-500/25 border-sky-400 text-white text-left shadow-md"
      : "p2p-qmode-btn p-2 rounded-xl border border-slate-700 bg-slate-950/70 hover:bg-slate-800 text-slate-300 transition text-left";
  });
  const regSec = document.getElementById("p2p-scope-region-section");
  const stSec = document.getElementById("p2p-scope-station-section");
  if (regSec) regSec.classList.toggle("hidden", qm === "station");
  if (stSec) stSec.classList.toggle("hidden", qm === "region");

  document.querySelectorAll(".p2p-diff-btn").forEach((btn) => {
    const isCur = btn.getAttribute("data-p2pdiff") === state.difficulty;
    btn.className = isCur
      ? "p2p-diff-btn text-left p-2 rounded-xl border transition bg-sky-500/20 border-sky-400 text-white"
      : "p2p-diff-btn text-left p-2 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition";
  });

  document.querySelectorAll(".p2p-playmode-btn").forEach((btn) => {
    const isCur = btn.getAttribute("data-p2pplaymode") === state.playMode;
    btn.className = isCur
      ? "p2p-playmode-btn py-1.5 px-2 rounded-xl text-xs font-bold border transition bg-emerald-500/20 border-emerald-400 text-emerald-200 text-center"
      : "p2p-playmode-btn py-1.5 px-2 rounded-xl text-xs font-bold border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-center transition";
  });

  const countiesGrid = document.getElementById("p2p-scope-counties-grid");
  if (countiesGrid) {
    countiesGrid.innerHTML = "";
    TAIWAN_ADMIN_DATA.forEach((c) => {
      const selected = state.selectedCounties.has(c.name);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = selected
        ? "p-1.5 rounded-xl border border-sky-400 bg-sky-500/20 text-left transition flex items-center justify-between"
        : "p-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-left transition flex items-center justify-between opacity-70";
      btn.innerHTML = `
        <div class="truncate">
          <span class="text-xs font-bold text-white">${c.name}</span>
          <span class="text-[9px] text-slate-400 ml-1">(${c.towns.length})</span>
        </div>
        <span class="w-3.5 h-3.5 rounded text-[10px] flex items-center justify-center ${selected ? "bg-sky-500 text-white font-bold" : "bg-slate-800 text-transparent"}">✓</span>
      `;
      btn.addEventListener("click", () => {
        if (state.selectedCounties.has(c.name)) state.selectedCounties.delete(c.name);
        else state.selectedCounties.add(c.name);
        onHostSettingChange("題庫範圍");
        renderP2PHostSettingsUI();
        renderScopeModalGrid();
      });
      countiesGrid.appendChild(btn);
    });
  }

  const stGrid = document.getElementById("p2p-scope-stations-grid");
  if (stGrid) {
    const chkTerminus = document.getElementById("chk-p2p-terminus-hints");
    if (chkTerminus) chkTerminus.checked = !!state.showStationTerminusHints;

    stGrid.innerHTML = "";
    const groups = new Map();
    TAIWAN_SELECTABLE_LINES.forEach((l) => {
      if (l.isHighway) return;
      if (!groups.has(l.group)) groups.set(l.group, []);
      groups.get(l.group).push(l);
    });

    groups.forEach((lines, groupTitle) => {
      const card = document.createElement("div");
      card.className = "p-2 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1";
      const allChecked = lines.every((l) => state.quizStationLines.has(l.id));

      const header = document.createElement("div");
      header.className = "flex items-center justify-between border-b border-slate-800/80 pb-1";
      header.innerHTML = `
        <span class="text-[11px] font-bold text-slate-200">${groupTitle} (${lines.length}線)</span>
        <button type="button" class="text-[10px] text-pink-400 hover:text-pink-300 font-semibold">${allChecked ? "取消本類" : "全選本類"}</button>
      `;
      header.querySelector("button").addEventListener("click", () => {
        lines.forEach((l) => {
          if (allChecked) state.quizStationLines.delete(l.id);
          else state.quizStationLines.add(l.id);
        });
        state.stationQuizEnabled = state.quizStationLines.size > 0;
        onHostSettingChange("車站路線");
        renderP2PHostSettingsUI();
        renderScopeModalGrid();
      });
      card.appendChild(header);

      const itemsWrap = document.createElement("div");
      itemsWrap.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1";
      lines.forEach((l) => {
        const checked = state.quizStationLines.has(l.id);
        const item = document.createElement("label");
        item.className = `flex items-center gap-1.5 p-1 rounded-lg border cursor-pointer transition ${
          checked ? "bg-pink-500/15 border-pink-400/60 text-white" : "bg-slate-950/60 border-slate-800 text-slate-400"
        }`;
        const lineTitle = typeof getLineDisplayName === "function" ? getLineDisplayName(l) : l.name;
        item.innerHTML = `
          <input type="checkbox" ${checked ? "checked" : ""} class="rounded bg-slate-900 border-slate-600 text-pink-500 w-3 h-3" />
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${l.color}"></span>
          <span class="truncate text-[10px] font-medium">${lineTitle} (${l.stations.length})</span>
        `;
        item.querySelector("input").addEventListener("change", (ev) => {
          if (ev.target.checked) state.quizStationLines.add(l.id);
          else state.quizStationLines.delete(l.id);
          state.stationQuizEnabled = state.quizStationLines.size > 0;
          onHostSettingChange("車站路線");
          renderP2PHostSettingsUI();
          renderScopeModalGrid();
        });
        itemsWrap.appendChild(item);
      });
      card.appendChild(itemsWrap);
      stGrid.appendChild(card);
    });
  }

  const totalTowns = getScopeTowns().length;
  const totalStations = countUniqueStationsForLines(state.quizStationLines);
  const stBadge = document.getElementById("p2p-scope-station-status-badge");
  if (stBadge) {
    if (state.quizStationLines.size === 0) {
      stBadge.textContent = "🚫 不猜車站 (0站)";
      stBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400";
    } else {
      stBadge.textContent = `🚉 已選 ${state.quizStationLines.size} 條路線 · 共 ${totalStations} 站`;
      stBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/40";
    }
  }

  const counterEl = document.getElementById("p2p-host-scope-counter");
  if (counterEl) {
    const adminPart =
      state.selectedCounties.size === 0
        ? "不猜行政區 (0區)"
        : `${state.selectedCounties.size} 縣市 (${totalTowns} 區)`;
    const stPart =
      state.quizStationLines.size === 0
        ? "不猜車站 (0站)"
        : `${state.quizStationLines.size} 條路線 (${totalStations} 站)`;
    counterEl.textContent = `已選題庫：${adminPart} + ${stPart}`;
  }
}

function renderP2PGuestSettingsPreview() {
  const container = document.getElementById("p2p-guest-preview-body");
  if (!container) return;
  const scrollParent = container.closest(".overflow-y-auto");
  const savedScrollTop = scrollParent ? scrollParent.scrollTop : 0;

  const diffNames = {
    casual: "🟢 休閒難度 (免打後綴，同名一次解鎖)",
    county_only: "🔵 縣市模式 (僅猜 22 縣市與直轄市)",
    hard_suffix: "🟡 進階後綴模式 (須含正確後綴)",
    hard_full: "🟠 困難全名模式 (368 區縣市+鄉鎮完整盲猜)",
    master_hierarchy: "🔥 三階宗師 (省 ➔ 縣市 ➔ 鄉鎮市區)"
  };
  const playModeNames = {
    free: "✍️ 自由默寫模式",
    target_random: "🎯 隨機指定區塊模式",
    target_click: "👆 點選指定區塊模式"
  };
  const modeNames = {
    region: "🗺️ 純地區模式",
    station: "🚉 純車站模式",
    mixed: "🔀 地區+車站混合模式"
  };

  const totalTowns = getScopeTowns().length;
  const activeStations = getActiveQuizStations();
  const selectedCountyList = Array.from(state.selectedCounties);
  const selectedLineObjects = TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway && state.quizStationLines.has(l.id));

  const layerRuleDesc = state.p2pLayerRule === "locked"
    ? `🔒 強制鎖定所有玩家底圖為「${state.p2pForcedLayer === "terrain" ? "無字山地地形" : state.p2pForcedLayer === "satellite" ? "無字衛星影像" : "純淨向量底圖"}」`
    : "🔓 不限制底圖 (個人可自由切換，不同步)";

  const railRuleDesc = state.p2pRailRule === "ban_roads_only"
    ? "🛑 僅 Ban 公路網 (保留軌道路線+車站點位)"
    : state.p2pRailRule === "ban_rail"
    ? "🚫 Ban 路網 (禁用軌道/公路線路；有車站題庫時可開關僅車站)"
    : state.p2pRailRule === "force_lines"
    ? "🛤️ 強制完整路網+車站 (含公路盾牌)"
    : state.p2pRailRule === "force_rail_only"
    ? "🚄 強制純軌道路網 (無公路雜訊)"
    : "🔓 自由 (不限制路網與車站開關)";

  container.innerHTML = `
    <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
      <div class="text-[11px] font-bold text-sky-400 uppercase tracking-wider">🎮 挑戰模式與規則</div>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="px-2.5 py-1 rounded-xl bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 text-xs">
          ${modeNames[state.quizTargetMode || "region"] || "地區模式"}
        </span>
        <span class="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 text-xs">
          ${diffNames[state.difficulty] || state.difficulty}
        </span>
        <span class="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-xs">
          ${playModeNames[state.playMode] || state.playMode}
        </span>
      </div>
    </div>

    <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-amber-300 uppercase tracking-wider">🗺️ 行政區出題範圍</span>
        <span class="text-[11px] font-mono-num font-bold text-emerald-400">
          ${selectedCountyList.length === 0 ? "🚫 不猜行政區" : selectedCountyList.length === 22 ? `全台 22 縣市 (共 368 區)` : `自選 ${selectedCountyList.length} 縣市 (共 ${totalTowns} 區)`}
        </span>
      </div>
      ${selectedCountyList.length > 0 && selectedCountyList.length < 22 ? `
        <div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-950/50 rounded-xl border border-slate-800/80">
          ${selectedCountyList.map(c => `<span class="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-500/30 text-[11px] font-medium">${c}</span>`).join("")}
        </div>
      ` : selectedCountyList.length === 22 ? `
        <div class="text-[11px] text-slate-400">包含全台 6 都直轄市、16 縣市全部 368 鄉鎮市區。</div>
      ` : `
        <div class="text-[11px] text-rose-300 font-medium">本場對戰關閉行政區題庫，專注挑戰軌道車站！</div>
      `}
    </div>

    <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-pink-300 uppercase tracking-wider">🚉 軌道與車站題庫細項</span>
        <span class="text-[11px] font-mono-num font-bold text-pink-300">
          ${selectedLineObjects.length === 0 ? "🚫 不猜車站" : `已選 ${selectedLineObjects.length} 條路線 · 共 ${activeStations.length} 站`}
        </span>
      </div>
      ${selectedLineObjects.length > 0 ? `
        <div class="flex flex-wrap gap-1 max-h-40 overflow-y-auto p-1 bg-slate-950/50 rounded-xl border border-slate-800/80">
          ${selectedLineObjects.map(l => {
            const lineTitle = typeof getLineDisplayName === "function" ? getLineDisplayName(l) : l.name;
            return `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-white">
              <span class="w-2 h-2 rounded-full shrink-0" style="background:${l.color}"></span>
              <span class="font-medium">${lineTitle}</span>
              <span class="text-slate-400 font-mono-num text-[10px]">(${l.stations.length}站)</span>
            </span>`;
          }).join("")}
        </div>
        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>頭尾端點站提示：<strong class="${state.showStationTerminusHints ? 'text-pink-300' : 'text-slate-500'}">${state.showStationTerminusHints ? '已開啟' : '已關閉 (防洩題)'}</strong></span>
        </div>
      ` : `
        <div class="text-[11px] text-slate-400">本場對戰未選取軌道車站題庫。</div>
      `}
    </div>

    <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
      <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">🛡️ 公平競技圖層限制</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
        <div class="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300">
          ${layerRuleDesc}
        </div>
        <div class="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-amber-300">
          ${railRuleDesc}
        </div>
      </div>
    </div>
  `;
  if (scrollParent && savedScrollTop > 0) {
    scrollParent.scrollTop = savedScrollTop;
  }
}

function toggleP2PReady() {
  if (state.isHost || state.role === "spectator") return;
  state.isReady = !state.isReady;
  state.nickname = (document.getElementById("p2p-nickname-input")?.value.trim()) || state.nickname || "玩家";
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
  if (senderId && state.players[senderId]) {
    state.players[senderId].finished = true;
    state.players[senderId].finishReason = payload.reason || "giveup";
    state.players[senderId].finalStats = payload;
    state.players[senderId].score = payload.adminCurrent ?? payload.grandScore ?? state.players[senderId].score;
    state.players[senderId].total = payload.adminTotal ?? payload.grandTotal ?? state.players[senderId].total;
    state.players[senderId].stationScore = payload.unlockedStCount ?? state.players[senderId].stationScore;
    state.players[senderId].stationTotal = payload.stationTotal ?? state.players[senderId].stationTotal;
  }

  syncPrimaryOpponentFromRoster();
  if (!senderId || !state.players[senderId]) {
    state.opponent.finished = true;
    state.opponent.finalStats = payload;
    state.opponent.score = payload.grandScore || payload.score || 0;
    state.opponent.total = payload.grandTotal || payload.total || 368;
  }

  if (state.isHost) {
    const allDone = getActiveBattlePlayers().every((p) => p.finished);
    if (allDone) {
      state.matchInProgress = false;
      broadcastRosterFromHost();
    }
  }

  updateOpponentUI();

  const oppPct = payload.grandTotal > 0 ? ((payload.grandScore / payload.grandTotal) * 100).toFixed(1) : "0.0";
  const reasonText = payload.reason === "victory" ? "100% 通關" : payload.reason === "timeout" ? "時間到" : "提早結束";

  if (state.finished) {
    showSettlementModal();
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
  const isMultiplayer = Boolean(state.opponent.connected || state.aiRivalTimer || getActiveBattlePlayers().length > 1);
  if (!isMultiplayer) {
    resetGame();
    document.getElementById("modal-settlement")?.classList.add("hidden");
    return;
  }

  const rematchBtn = document.getElementById("btn-rematch-settlement");
  const rematchText = document.getElementById("rematch-btn-text");
  if (rematchBtn) rematchBtn.disabled = true;
  if (rematchText) rematchText.textContent = "⏳ 已發送重開邀請，等待同意...";

  if (state.aiRivalTimer || (state.opponent.name && state.opponent.name.includes("AI"))) {
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

  sendP2PMessage(accepted ? "REMATCH_ACCEPT" : "REMATCH_DECLINE", {});

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

function handleRematchDeclined() {
  const rematchBtn = document.getElementById("btn-rematch-settlement");
  const rematchText = document.getElementById("rematch-btn-text");
  if (rematchBtn) rematchBtn.disabled = false;
  if (rematchText) rematchText.textContent = "發起重開對戰";
  setFeedback("對手婉拒了重新開局邀請", "warn");
}

function initP2PEngine() {
  injectP2PExtensionsUI();
  try {
    state.bcChannel = new BroadcastChannel("taiwan_geomaster_p2p_sync");
    state.bcChannel.onmessage = (ev) => {
      if (ev.data) dispatchP2PMessage(ev.data);
    };
  } catch (e) {}

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const urlRoom = params.get("room") || hashParams.get("room") || hashParams.get("p2p");
  const urlDiff = params.get("diff") || hashParams.get("diff");
  const urlLayerRule = params.get("lrule") || hashParams.get("lrule");
  const urlForcedLayer = params.get("flayer") || hashParams.get("flayer");
  const urlRailRule = params.get("rrule") || hashParams.get("rrule");

  if (urlDiff && ["casual", "county_only", "hard_suffix", "hard_full", "master_hierarchy"].includes(urlDiff)) {
    setDifficulty(urlDiff);
  }
  if (urlLayerRule || urlRailRule) {
    applyP2PLayerRule(urlLayerRule || "free", urlForcedLayer || "vector", urlRailRule || "free");
  }

  if (urlRoom) {
    const cleanCode = urlRoom.trim().toUpperCase();
    const roomInput = document.getElementById("p2p-room-code-input");
    if (roomInput) roomInput.value = cleanCode;
    joinP2PRoom(cleanCode);

    const modalP2p = document.getElementById("modal-p2p");
    if (modalP2p) {
      modalP2p.classList.remove("hidden");
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    }
  }
  updateP2PLobbyUI();
}

function hostP2PRoom() {
  injectP2PExtensionsUI();
  const code = "TW" + Math.random().toString(36).substring(2, 6).toUpperCase();
  const pwd = document.getElementById("p2p-password-input")?.value.trim() || "";
  state.roomCode = code;
  state.roomPassword = pwd;
  state.isHost = true;
  state.role = "host";
  state.matchInProgress = false;
  state.promptedLastPlayer = false;
  state.isReady = true;
  state.peers = new Map();
  state.players = {};
  state.opponent.connected = false;
  state.opponent.isReady = false;
  state.opponent.name = "對手";

  ensureLocalPlayerInRoster();

  const lrule = document.getElementById("p2p-layer-rule-select")?.value || "free";
  const flayer = document.getElementById("p2p-forced-layer-select")?.value || "vector";
  const rruleEl = document.getElementById("p2p-rail-rule-select");
  const rrule = rruleEl ? rruleEl.value : "free";
  applyP2PLayerRule(lrule, flayer, rrule);

  const roomInput = document.getElementById("p2p-room-code-input");
  if (roomInput) roomInput.value = code;
  const roomTag = document.getElementById("p2p-room-tag");
  if (roomTag) roomTag.textContent = `房號: ${code} (Host${pwd ? " 🔒" : ""})`;
  const dot = document.getElementById("p2p-status-dot");
  if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-ping";

  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${code}&diff=${state.difficulty}&lrule=${lrule}&flayer=${flayer}&rrule=${rrule}`;
  const shareInput = document.getElementById("p2p-share-url");
  if (shareInput) shareInput.value = shareUrl;
  const statusEl = document.getElementById("p2p-modal-status");
  if (statusEl) statusEl.textContent = `已建立房間 ${code}${pwd ? "（已設密碼保護）" : ""}！等待玩家加入並準備`;
  updateP2PPanelVisibility();
  updateP2PLobbyUI();

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
  injectP2PExtensionsUI();
  const code = (codeInput || document.getElementById("p2p-room-code-input")?.value || "").trim().toUpperCase();
  if (!code) return;
  const pwd = document.getElementById("p2p-password-input")?.value.trim() || "";
  const wantSpectate = Boolean(document.getElementById("chk-p2p-join-spectate")?.checked);

  state.roomCode = code;
  state.roomPassword = pwd;
  state.isHost = false;
  state.role = wantSpectate ? "spectator" : "player";
  state.isReady = false;
  state.promptedLastPlayer = false;
  state.players = {};
  state.opponent.connected = true;

  const roomTag = document.getElementById("p2p-room-tag");
  if (roomTag) roomTag.textContent = `房號: ${code} (已連線)`;
  const dot = document.getElementById("p2p-status-dot");
  if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-400";
  const statusEl = document.getElementById("p2p-modal-status");
  if (statusEl) statusEl.textContent = `正在連線至房間 ${code}...`;

  const modalP2p = document.getElementById("modal-p2p");
  if (modalP2p) modalP2p.classList.remove("hidden");

  updateP2PPanelVisibility();
  updateP2PLobbyUI();

  state.nickname = (document.getElementById("p2p-nickname-input")?.value.trim()) || state.nickname || "玩家";

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

  sendP2PMessage("LOBBY_JOIN", {
    name: state.nickname,
    password: pwd,
    wantSpectate
  });
}

function setupPeerConnectionHandlers(conn) {
  conn.on("open", () => {
    state.opponent.connected = true;
    updateP2PPanelVisibility();
    state.nickname = (document.getElementById("p2p-nickname-input")?.value.trim()) || state.nickname || "玩家";
    if (state.isHost) {
      const statusEl = document.getElementById("p2p-modal-status");
      if (statusEl) statusEl.textContent = `玩家已連線！等待所有玩家準備後開局`;
    } else {
      const pwd = document.getElementById("p2p-password-input")?.value.trim() || state.roomPassword || "";
      const wantSpectate = Boolean(document.getElementById("chk-p2p-join-spectate")?.checked) || state.role === "spectator";
      try {
        conn.send({
          type: "LOBBY_JOIN",
          payload: { name: state.nickname, password: pwd, wantSpectate },
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
            const leftName = state.players[sid].name;
            delete state.players[sid];
            setFeedback(`🚪 玩家【${leftName}】已離開房間`, "warn");
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

function broadcastP2PState(lastItemName) {
  if (state.role === "spectator") return;
  const counts = getLocalGrandCounts();
  ensureLocalPlayerInRoster();

  const payload = {
    senderId: state.localInstanceId,
    name: (document.getElementById("p2p-nickname-input")?.value.trim()) || state.nickname || "玩家",
    role: state.isHost ? "host" : "player",
    score: counts.regionCurrent,
    total: counts.regionTotal,
    stationScore: counts.stationCurrent,
    stationTotal: counts.stationTotal,
    macroProgress: counts.macroProgress,
    finished: Boolean(state.finished),
    finishReason: state.finalStats?.reason || null,
    elapsedSec: state.elapsedSec
  };

  sendP2PMessage("SYNC_STATE", payload);
  updateOpponentUI();
}

function handleIncomingP2PData(payload, senderIdFromMsg = null) {
  if (!payload) return;
  const sid = payload.senderId || senderIdFromMsg;
  if (sid && sid === state.localInstanceId) return;

  if (sid) {
    const existing = state.players[sid] || { id: sid, role: payload.role || "player" };
    state.players[sid] = {
      ...existing,
      id: sid,
      name: payload.name || existing.name || "對手",
      score: payload.score || 0,
      total: payload.total ?? existing.total ?? 0,
      stationScore: payload.stationScore || 0,
      stationTotal: payload.stationTotal ?? existing.stationTotal ?? 0,
      macroProgress: payload.macroProgress || {},
      finished: Boolean(payload.finished || existing.finished),
      finishReason: payload.finishReason || existing.finishReason || null
    };
  }

  syncPrimaryOpponentFromRoster();
  if (!sid) {
    state.opponent.connected = true;
    state.opponent.name = payload.name || "對手";
    state.opponent.score = payload.score || 0;
    state.opponent.total = payload.total || 0;
    state.opponent.stationScore = payload.stationScore || 0;
    state.opponent.stationTotal = payload.stationTotal || 0;
    state.opponent.macroProgress = payload.macroProgress || {};
  }
  updateP2PPanelVisibility();
  updateOpponentUI();
}

function updateOpponentUI() {
  injectP2PExtensionsUI();
  ensureLocalPlayerInRoster();

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

  const counts = getLocalGrandCounts();
  const localGrandCur = counts.grandCurrent;
  const diff = localGrandCur - grandCur;

  const lastEl = document.getElementById("remote-p2p-last");
  if (lastEl) {
    if (state.opponent.finished) {
      const rText = state.opponent.finalStats?.reason === "victory" ? "👑 已100%通關" : "🏁 已提早結束";
      lastEl.textContent = `${rText} (${grandCur}/${grandTot})`;
      lastEl.className = "text-[10px] text-amber-300 font-bold truncate";
    } else if (diff > 0) {
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

  // Multi-player Live List (>2 players or spectator view)
  const multiList = document.getElementById("p2p-multiplayer-live-list");
  if (multiList) {
    const activePlayers = getActiveBattlePlayers();
    const spectators = getSpectators();
    if (activePlayers.length > 2 || state.role === "spectator" || spectators.length > 0) {
      multiList.classList.remove("hidden");
      const sorted = [...activePlayers].sort((a, b) => {
        const aTot = (a.total || 0) + (a.stationTotal || 0);
        const bTot = (b.total || 0) + (b.stationTotal || 0);
        const aCur = (a.score || 0) + (a.stationScore || 0);
        const bCur = (b.score || 0) + (b.stationScore || 0);
        const aPct = aTot > 0 ? aCur / aTot : 0;
        const bPct = bTot > 0 ? bCur / bTot : 0;
        return bPct - aPct || bCur - aCur;
      });
      multiList.innerHTML = `
        <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold px-0.5">
          <span>⚔️ 即時戰況排行 (${activePlayers.length} 人參賽)</span>
          ${spectators.length > 0 ? `<span class="text-amber-300">👁️ 觀戰 ${spectators.length} 人</span>` : ""}
        </div>
        <div class="space-y-1">
          ${sorted.map((p, idx) => {
            const tot = (p.total || 0) + (p.stationTotal || 0);
            const cur = (p.score || 0) + (p.stationScore || 0);
            const pct = tot > 0 ? ((cur / tot) * 100).toFixed(1) : "0.0";
            const isMe = p.id === state.localInstanceId;
            const statusTag = p.finished
              ? `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">${p.finishReason === "victory" ? "👑 通關" : "🏁 已結束"}</span>`
              : `<span class="text-[9px] text-slate-400">作答中</span>`;
            return `
              <div class="p-1.5 rounded-xl bg-slate-900/80 border ${isMe ? "border-sky-500/50" : "border-slate-800"} space-y-1">
                <div class="flex items-center justify-between text-[11px]">
                  <div class="flex items-center gap-1 truncate">
                    <span class="font-mono-num text-slate-400">#${idx + 1}</span>
                    <span class="font-bold text-white truncate max-w-[110px]">${p.role === "host" ? "👑 " : ""}${p.name}${isMe ? " (我)" : ""}</span>
                    ${statusTag}
                  </div>
                  <span class="font-mono-num text-sky-300 font-bold shrink-0">${cur}/${tot} (${pct}%)</span>
                </div>
                <div class="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full ${p.finished ? "bg-amber-400" : "bg-sky-400"} transition-all duration-300" style="width:${Math.min(100, parseFloat(pct))}%"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    } else {
      multiList.classList.add("hidden");
    }
  }

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
        "輕軌": "🚊 輕軌",
        "纜車": "🚡 纜車",
        "林鐵": "🌲 林鐵",
        "糖鐵": "🍬 糖鐵"
      };
      barsEl.innerHTML = macroKeys.map((k) => {
        const oppData = mp[k] || { cur: 0, tot: 1 };
        const oppPct = oppData.tot > 0 ? Math.round((oppData.cur / oppData.tot) * 100) : 0;
        let myPct = 0;
        if (k === "地區") {
          myPct = counts.regionTotal > 0 ? Math.round((counts.regionCurrent / counts.regionTotal) * 100) : 0;
        } else {
          const activeSt = getActiveQuizStations();
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
  getParticipantList().forEach((p) => {
    p.finished = false;
    p.finishReason = null;
    p.finalStats = null;
    p.score = 0;
    p.stationScore = 0;
  });

  if (isHost) {
    sendP2PMessage("SYNC_START", cfg);
    broadcastRosterFromHost();
  }

  const modalP2p = document.getElementById("modal-p2p");
  if (modalP2p) modalP2p.classList.add("hidden");

  if (cfg) {
    applyRemoteSyncConfig(cfg, true);
  } else {
    resetGame();
  }
  applySpectatorInputLock();

  const existing = document.getElementById("p2p-countdown-overlay");
  if (existing) existing.remove();

  const isSpec = state.role === "spectator";
  const overlay = document.createElement("div");
  overlay.id = "p2p-countdown-overlay";
  overlay.className = "fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md select-none";
  overlay.innerHTML = `
    <div class="text-center space-y-4">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold uppercase tracking-widest animate-pulse">
        <span>${isSpec ? "👁️ SPECTATOR MODE · 觀戰模式" : "⚔️ MULTIPLAYER BATTLE · 即時連線對戰"}</span>
      </div>
      <div id="p2p-cd-number" class="text-9xl font-black text-white tracking-tighter" style="text-shadow: 0 0 60px rgba(56, 189, 248, 0.85); transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
        3
      </div>
      <div id="p2p-cd-status" class="text-sm font-semibold text-slate-300 tracking-wider">
        ${isSpec ? "觀戰視角準備中，對戰即將開始！" : "全員已就緒，準備開局！"}
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
        statusEl.textContent = isSpec ? "👁️ 對戰已開始，自由觀戰各玩家進度！" : "🔥 比賽開始！輸入第一個地名即刻進攻！";
        statusEl.className = "text-base font-bold text-emerald-300 tracking-wider";
      }
      playCountdownBeep(880, 0.35, "triangle");
    } else {
      clearInterval(interval);
      overlay.remove();
      startTimer();
      setFeedback(isSpec ? "👁️ 觀戰開始！" : "⚔️ 對戰正式開始！全員同步計時，衝向 100% 吧！", "tier");
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

function applyRemoteSyncConfig(cfg, fromCountdown = false) {
  if (!cfg) return;
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

  // Enforce strict mode consistency so region mode never leaks stations and station mode never leaks counties
  if (state.quizTargetMode === "region") {
    state.quizStationLines.clear();
    state.stationQuizEnabled = false;
  } else if (state.quizTargetMode === "station") {
    state.selectedCounties.clear();
    state.stationQuizEnabled = state.quizStationLines.size > 0;
  } else {
    state.stationQuizEnabled = state.quizStationLines.size > 0;
  }

  // Only sync station lines for visual dots when stations are actively quizzed; never override local transportMode in pure region mode
  if (state.stationQuizEnabled && state.quizStationLines.size > 0) {
    state.selectedTransportLines = new Set(state.quizStationLines);
    if (state.transportMode === "off" && state.p2pRailRule !== "ban_rail") {
      state.transportMode = "lines_and_stations";
    }
  }

  if (cfg.difficulty && ["casual", "county_only", "hard_suffix", "hard_full", "master_hierarchy"].includes(cfg.difficulty)) {
    state.difficulty = cfg.difficulty;
    document.querySelectorAll(".diff-btn, .p2p-diff-btn").forEach((btn) => {
      const isCurrent = btn.getAttribute("data-diff") === cfg.difficulty || btn.getAttribute("data-p2pdiff") === cfg.difficulty;
      btn.className = isCurrent
        ? "diff-btn text-left p-2.5 rounded-xl border transition bg-sky-500/20 border-sky-400 text-white"
        : "diff-btn text-left p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/70 text-slate-300 transition";
    });
    updateModeBadgeText();
  }
  if (cfg.playMode) {
    state.playMode = cfg.playMode;
    document.querySelectorAll(".playmode-btn, .p2p-playmode-btn").forEach((btn) => {
      const isCurrent = btn.getAttribute("data-playmode") === cfg.playMode || btn.getAttribute("data-p2pplaymode") === cfg.playMode;
      btn.className = isCurrent
        ? "playmode-btn py-2.5 px-3 rounded-xl text-xs font-bold border transition bg-emerald-500/20 border-emerald-400 text-emerald-200 text-center"
        : "playmode-btn py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-center transition";
    });
    updateModeBadgeText();
  }
  if (cfg.timerMode) state.timerMode = cfg.timerMode;
  if (cfg.countdownTotalSec) state.countdownTotalSec = cfg.countdownTotalSec;

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

  if (cfg.layerRule || cfg.railRule) {
    applyP2PLayerRule(cfg.layerRule, cfg.forcedLayer, cfg.railRule);
  }

  resetGame();
  renderScopeModalGrid();

  if (!fromCountdown && !state.isHost && state.role !== "spectator" && cfg.isSettingChange) {
    state.isReady = false;
    sendP2PMessage("SYNC_READY_STATUS", { ready: false, name: state.nickname });
    playTone("error");
    const warningBanner = document.getElementById("p2p-re-ready-warning");
    if (warningBanner) warningBanner.classList.remove("hidden");
    setFeedback(`⚠️ 房主變更了房間設定 (${summaryLabel})，請重新確認並點擊「準備」！`, "warn");
  } else if (!fromCountdown) {
    setFeedback(`🔄 已同步最新房間設定「${summaryLabel}」！`, "info");
  }

  updateP2PLobbyUI();
}

function broadcastP2PConfig(isSettingChange = false) {
  if (!state.isHost) return;
  sendP2PMessage("SYNC_CONFIG", getHostSyncConfig(isSettingChange));
}

function onHostSettingChange(name = "") {
  if (!state.isHost) return;
  getNonHostBattlePlayers().forEach((p) => { p.isReady = false; });
  state.opponent.isReady = false;
  broadcastP2PConfig(true);
  broadcastRosterFromHost();
  updateP2PLobbyUI();
  setFeedback(`已更新${name ? `「${name}」` : "房間設定"}，已同步所有玩家畫面，等待重新確認準備！`, "warn");
}

function applyScopePreset(presetKey) {
  if (presetKey === "all") {
    state.quizTargetMode = "region";
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.map((c) => c.name));
    state.quizStationLines.clear();
    state.stationQuizEnabled = false;
  } else if (presetKey === "six_cities") {
    state.quizTargetMode = "region";
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.isSpecial).map((c) => c.name));
    state.quizStationLines.clear();
    state.stationQuizEnabled = false;
  } else if (presetKey === "north") {
    state.quizTargetMode = "region";
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.region === "north").map((c) => c.name));
    state.quizStationLines.clear();
    state.stationQuizEnabled = false;
  } else if (presetKey === "central") {
    state.quizTargetMode = "region";
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.region === "central").map((c) => c.name));
    state.quizStationLines.clear();
    state.stationQuizEnabled = false;
  } else if (presetKey === "south") {
    state.quizTargetMode = "region";
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.region === "south").map((c) => c.name));
    state.quizStationLines.clear();
    state.stationQuizEnabled = false;
  } else if (presetKey === "east_islands") {
    state.quizTargetMode = "region";
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.region === "east" || ["澎湖縣", "金門縣", "連江縣"].includes(c.name)).map((c) => c.name));
    state.quizStationLines.clear();
    state.stationQuizEnabled = false;
  } else if (presetKey === "stations_only") {
    state.quizTargetMode = "station";
    state.selectedCounties.clear();
    state.quizStationLines = new Set(TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway).map((l) => l.id));
    state.stationQuizEnabled = true;
    state.transportMode = "rail_only";
  }
  renderScopeModalGrid();
  updatePrefixDropdownUI();
  updateScoreAndProgressUI();
  onHostSettingChange("題庫範圍");
}

function toggleAiRivalSimulation() {
  const btn = document.getElementById("btn-quick-sim-rival");
  if (state.aiRivalTimer || state.aiRivalActive) {
    if (state.aiRivalTimer) clearInterval(state.aiRivalTimer);
    state.aiRivalTimer = null;
    state.aiRivalActive = false;
    state.opponent.connected = false;
    state.opponent.isReady = false;
    delete state.players["ai_rival"];
    if (btn) btn.textContent = "🤖 開啟AI虛擬對手陪練";
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
    finished: false,
    score: 0,
    total: state.opponent.total,
    stationScore: 0,
    stationTotal: state.opponent.stationTotal
  };
  if (btn) btn.textContent = "⏹️ 停止AI對手陪練";

  updateP2PPanelVisibility();
  updateP2PLobbyUI();
  updateOpponentUI();
  setFeedback("🤖 AI 虛擬對手已準備就緒！請確認房間設定後，點擊下方「立即開局」！", "tier");
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
        const totMacro = activeSt.filter(s => s.macro === randomSt.macro).length;
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
