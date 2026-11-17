// ============================================================================
// 12. UI CONTROLS, UNIFIED HUB CONTROLLER & WINDOWS IME EVENT LISTENERS
// ============================================================================
function syncConfigButtonsUI() {
  const qm = state.quizTargetMode || "region";
  document.querySelectorAll(".qmode-btn").forEach((btn) => {
    const isCur = btn.getAttribute("data-qmode") === qm;
    btn.className = isCur
      ? "qmode-btn p-2.5 rounded-xl border transition bg-sky-500/25 border-sky-400 text-white text-left shadow-md"
      : "qmode-btn p-2.5 rounded-xl border border-slate-700 bg-slate-950/70 hover:bg-slate-800 text-slate-300 transition text-left";
  });

  const regSec = document.getElementById("scope-region-section");
  const stSec = document.getElementById("scope-station-section");
  if (regSec) regSec.classList.toggle("hidden", qm === "station");
  if (stSec) stSec.classList.toggle("hidden", qm === "region");

  document.querySelectorAll(".diff-btn").forEach((btn) => {
    const isCurrent = btn.getAttribute("data-diff") === state.difficulty;
    btn.className = isCurrent
      ? "diff-btn text-left p-2.5 rounded-xl border transition bg-sky-500/20 border-sky-400 text-white"
      : "diff-btn text-left p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/70 text-slate-300 transition";
  });

  document.querySelectorAll(".playmode-btn").forEach((btn) => {
    const isCurrent = btn.getAttribute("data-playmode") === state.playMode;
    btn.className = isCurrent
      ? "playmode-btn py-2 px-2.5 rounded-xl text-xs font-bold border transition bg-emerald-500/20 border-emerald-400 text-emerald-200 text-center"
      : "playmode-btn py-2 px-2.5 rounded-xl text-xs font-bold border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-center transition";
  });

  document.querySelectorAll(".hub-timer-btn").forEach((btn) => {
    const tMode = btn.getAttribute("data-timermode");
    const tSec = parseInt(btn.getAttribute("data-sec"), 10) || 0;
    const isCurrent =
      (state.timerMode === "up" && tMode === "up") ||
      (state.timerMode === "down" && tMode === "down" && state.countdownTotalSec === tSec);
    btn.className = isCurrent
      ? "hub-timer-btn px-2.5 py-2 rounded-xl text-xs font-bold border border-sky-400 bg-sky-500/20 text-white transition"
      : "hub-timer-btn px-2.5 py-2 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800 transition";
  });
}

function setDifficulty(diff) {
  if (!canLocalModifyGameConfig()) {
    setFeedback("🔒 防作弊保護：僅房主可調整難度，且須經全體參賽玩家同意！", "error");
    playTone("error");
    syncConfigButtonsUI();
    return;
  }
  if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
    if (diff === state.difficulty) return;
    requestOrApplyConfigChange({ difficulty: diff }, "挑戰難度");
    return;
  }
  state.difficulty = diff;
  syncConfigButtonsUI();
  updateModeBadgeText();
  resetGame();
  if (state.isHost && state.roomCode) {
    onHostSettingChange("挑戰難度");
  }
}

function setPlayMode(pm) {
  if (!canLocalModifyGameConfig()) {
    setFeedback("🔒 防作弊保護：僅房主可調整出題方式，且須經全體參賽玩家同意！", "error");
    playTone("error");
    syncConfigButtonsUI();
    return;
  }
  if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
    if (pm === state.playMode) return;
    requestOrApplyConfigChange({ playMode: pm }, "出題方式");
    return;
  }
  state.playMode = pm;
  syncConfigButtonsUI();
  updateModeBadgeText();
  if (pm === "target_random") {
    pickNextTargetRegion();
  } else {
    state.targetId = null;
    updateTargetBannerUI();
    refreshAllPolygonStyles();
  }
  if (state.isHost && state.roomCode) {
    onHostSettingChange("出題方式");
  }
}

function updateModeBadgeText() {
  const diffNames = {
    casual: "休閒難度",
    county_only: "22縣市模式",
    hard_suffix: "進階後綴",
    hard_full: "困難全名",
    master_hierarchy: "最難三階解鎖"
  };
  const pmNames = {
    free: "自由默寫",
    target_random: "隨機指定",
    target_click: "點選指定"
  };
  const pill = document.getElementById("current-mode-pill");
  if (pill) {
    pill.textContent = `${pmNames[state.playMode] || "自由默寫"} · ${diffNames[state.difficulty] || "休閒難度"}`;
  }
}

function countUniqueStationsForLines(lineIdSet) {
  const seen = new Set();
  TAIWAN_SELECTABLE_LINES.forEach((line) => {
    if (line.isHighway || !lineIdSet.has(line.id)) return;
    line.stations.forEach((st) => {
      const base = cleanStationBaseName(st[0]);
      seen.add(`${line.stKind}_${base}_${st[1].toFixed(2)}_${st[2].toFixed(2)}`);
    });
  });
  return seen.size;
}

// Shared MVC Line Checklist Renderer (Used by both #scope-stations-grid and #transport-lines-checklist)
function renderLineChecklistView(containerEl, selectedSet, includeHighways, accentTheme, onChangeCallback) {
  if (!containerEl) return;
  containerEl.replaceChildren();

  const groups = new Map();
  TAIWAN_SELECTABLE_LINES.forEach((l) => {
    if (!includeHighways && l.isHighway) return;
    if (!groups.has(l.group)) groups.set(l.group, []);
    groups.get(l.group).push(l);
  });

  const tplGroup = document.getElementById("tpl-line-group-card");
  const tplItem = document.getElementById("tpl-line-check-item");

  groups.forEach((lines, groupTitle) => {
    if (!tplGroup || !tplGroup.content) return;
    const card = tplGroup.content.firstElementChild.cloneNode(true);
    const allChecked = lines.every((l) => selectedSet.has(l.id));

    const gTitleEl = card.querySelector(".group-title");
    const gBtnEl = card.querySelector(".group-toggle-btn");
    const itemsGrid = card.querySelector(".group-items-grid");

    if (gTitleEl) gTitleEl.textContent = `${groupTitle} (${lines.length}線)`;
    if (gBtnEl) {
      gBtnEl.textContent = allChecked ? "取消本類" : "全選本類";
      gBtnEl.className =
        accentTheme === "pink"
          ? "group-toggle-btn text-[11px] text-pink-400 hover:text-pink-300 font-semibold"
          : "group-toggle-btn text-[11px] text-sky-400 hover:text-sky-300 font-semibold";
      gBtnEl.addEventListener("click", () => {
        onChangeCallback(lines.map((l) => l.id), !allChecked);
      });
    }

    if (itemsGrid && tplItem && tplItem.content) {
      lines.forEach((l) => {
        const checked = selectedSet.has(l.id);
        const item = tplItem.content.firstElementChild.cloneNode(true);
        item.className = `flex items-center gap-2 p-1.5 rounded-xl border cursor-pointer transition ${
          checked
            ? accentTheme === "pink"
              ? "bg-pink-500/15 border-pink-400/60 text-white"
              : "bg-slate-800/90 border-sky-500/40 text-white"
            : "bg-slate-950/60 border-slate-800 text-slate-400"
        }`;
        const chk = item.querySelector(".line-chk");
        const dot = item.querySelector(".line-dot");
        const nameSpan = item.querySelector(".line-name");
        const lineTitle = typeof getLineDisplayName === "function" ? getLineDisplayName(l) : l.name;

        if (chk) {
          chk.checked = checked;
          chk.addEventListener("change", (ev) => {
            onChangeCallback([l.id], ev.target.checked);
          });
        }
        if (dot) dot.style.background = l.color;
        if (nameSpan) {
          nameSpan.textContent = l.isHighway ? lineTitle : `${lineTitle} (${l.stations.length}站)`;
        }
        itemsGrid.appendChild(item);
      });
    }
    containerEl.appendChild(card);
  });
}

function renderScopeModalGrid() {
  syncConfigButtonsUI();

  const grid = document.getElementById("scope-counties-grid");
  const tplCounty = document.getElementById("tpl-scope-county-btn");
  if (grid && tplCounty && tplCounty.content) {
    grid.replaceChildren();
    TAIWAN_ADMIN_DATA.forEach((c) => {
      const selected = state.selectedCounties.has(c.name);
      const btn = tplCounty.content.firstElementChild.cloneNode(true);
      btn.className = selected
        ? "p-2 rounded-2xl border border-sky-400 bg-sky-500/20 text-left transition flex items-center justify-between"
        : "p-2 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-left transition flex items-center justify-between opacity-70";
      const nameEl = btn.querySelector(".county-name");
      const metaEl = btn.querySelector(".county-meta");
      const chkEl = btn.querySelector(".county-check");
      if (nameEl) nameEl.textContent = c.name;
      if (metaEl) metaEl.textContent = `${c.province} · ${c.towns.length} 區`;
      if (chkEl) {
        chkEl.className = `county-check w-4 h-4 rounded-md flex items-center justify-center text-xs ${
          selected ? "bg-sky-500 text-white" : "bg-slate-800 text-transparent"
        }`;
      }
      btn.addEventListener("click", () => {
        if (!canLocalModifyGameConfig()) {
          setFeedback("🔒 防作弊保護：僅房主可調整行政區範圍！", "warn");
          return;
        }
        const nextSet = new Set(state.selectedCounties);
        if (nextSet.has(c.name)) nextSet.delete(c.name);
        else nextSet.add(c.name);

        if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
          requestOrApplyConfigChange({ selectedCounties: Array.from(nextSet) }, "行政區範圍");
          return;
        }
        state.selectedCounties = nextSet;
        renderScopeModalGrid();
        if (state.isHost && state.roomCode) onHostSettingChange("行政區範圍");
      });
      grid.appendChild(btn);
    });
  }

  const stGrid = document.getElementById("scope-stations-grid");
  const chkTerminusScope = document.getElementById("chk-station-terminus-hints");
  if (chkTerminusScope) chkTerminusScope.checked = Boolean(state.showStationTerminusHints);

  renderLineChecklistView(stGrid, state.quizStationLines, false, "pink", (lineIds, shouldAdd) => {
    if (!canLocalModifyGameConfig()) {
      setFeedback("🔒 防作弊保護：僅房主可調整車站題庫路線！", "warn");
      return;
    }
    const nextLines = new Set(state.quizStationLines);
    lineIds.forEach((id) => {
      if (shouldAdd) nextLines.add(id);
      else nextLines.delete(id);
    });
    if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
      requestOrApplyConfigChange({ quizStationLines: Array.from(nextLines) }, "車站題庫路線");
      return;
    }
    state.quizStationLines = nextLines;
    state.stationQuizEnabled = state.quizStationLines.size > 0;
    renderScopeModalGrid();
    if (state.isHost && state.roomCode) onHostSettingChange("車站題庫路線");
  });

  const totalTowns = getScopeTowns().length;
  const totalStations = countUniqueStationsForLines(state.quizStationLines);
  const stBadge = document.getElementById("scope-station-status-badge");
  if (stBadge) {
    if (state.quizStationLines.size === 0) {
      stBadge.textContent = "🚫 不猜車站 (0站)";
      stBadge.className = "text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400";
    } else {
      stBadge.textContent = `🚉 已選 ${state.quizStationLines.size} 條路線 · 共 ${totalStations} 站`;
      stBadge.className = "text-[11px] font-bold px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/40";
    }
  }

  const counterEl = document.getElementById("scope-modal-counter");
  const adminPart =
    state.selectedCounties.size === 0
      ? "不猜行政區 (0區)"
      : `${state.selectedCounties.size} 縣市 (${totalTowns} 鄉鎮市區)`;
  const stPart =
    state.quizStationLines.size === 0
      ? "不猜車站 (0站)"
      : `${state.quizStationLines.size} 條路線 (${totalStations} 座車站)`;
  const fullCounterText = `已選題庫：${adminPart} + ${stPart}`;
  if (counterEl) {
    counterEl.textContent = fullCounterText;
  }
  const guestSum = document.getElementById("guest-readonly-summary");
  if (guestSum) {
    guestSum.textContent = fullCounterText;
  }
}

const MODAL_IDS = [
  "modal-scope",
  "modal-transport",
  "modal-perf",
  "modal-timer",
  "modal-info",
  "modal-settlement",
  "modal-opponent-finished",
  "modal-rematch-confirm",
  "modal-config-vote"
];

function syncModalBodyScrollLock() {
  const anyOpen = MODAL_IDS.some((id) => {
    const el = document.getElementById(id);
    return el && !el.classList.contains("hidden");
  });
  document.body.classList.toggle("modal-open", anyOpen);
}

function syncP2PRoomAccordionUI() {
  const p2pSidebar = document.getElementById("p2p-lobby-sidebar");
  const toggleBtn = document.getElementById("btn-toggle-p2p-panel");
  const toggleBtnText = document.getElementById("p2p-toggle-btn-text");
  const accBadge = document.getElementById("p2p-accordion-badge");
  const accSub = document.getElementById("p2p-accordion-subtitle");

  const expanded = Boolean(state.p2pPanelExpanded);
  if (p2pSidebar) {
    p2pSidebar.classList.toggle("hidden", !expanded);
  }
  if (toggleBtn && toggleBtnText) {
    toggleBtnText.textContent = expanded ? "🔼 收合多人房間設定" : "⚔️ 開啟多人 / 展開房間設定 ▾";
    toggleBtn.className = expanded
      ? "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-600 text-xs font-bold transition flex items-center gap-1.5"
      : "px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/45 text-indigo-200 border border-indigo-400/50 text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm";
  }

  if (accBadge && accSub) {
    if (state.roomCode || state.aiRivalActive) {
      const codeStr = state.roomCode || "AI陪練";
      if (state.isHost) {
        accBadge.textContent = `👑 房號: ${codeStr} (房主)`;
        accBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40";
        accSub.textContent = "已建立多人房間 · 可於下方複製觀戰/參賽連結、設定公平競技底圖與路網限制，並調整挑戰題庫";
      } else if (state.role === "spectator") {
        accBadge.textContent = `👁️ 房號: ${codeStr} (觀戰中)`;
        accBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40";
        accSub.textContent = "目前為觀戰模式，可隨時切換為參賽選手或向下捲動檢視本局題庫設定";
      } else {
        accBadge.textContent = `🎮 房號: ${codeStr} (參賽選手)`;
        accBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40";
        accSub.textContent = "請向下捲動確認本局挑戰題庫與圖層限制後，點擊「準備 (Ready)」等待房主開局";
      }
    } else {
      accBadge.textContent = expanded ? "⚡ 待建立或入房" : "👤 單人未開房";
      accBadge.className = expanded
        ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
        : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700";
      accSub.textContent =
        "單人練習免開房；展開後可建立房間 (>2人)、輸入房號連線觀戰/參賽，或設定公平底圖與路網限制";
    }
  }
}

function toggleP2PRoomPanel(forceExpand = null) {
  state.p2pPanelExpanded = typeof forceExpand === "boolean" ? forceExpand : !state.p2pPanelExpanded;
  if (state.p2pPanelExpanded && state.hubEntryTab === "solo") {
    state.hubEntryTab = state.roomCode ? (state.isHost ? "host" : "join") : "host";
  } else if (!state.p2pPanelExpanded && !state.roomCode && !state.aiRivalActive) {
    state.hubEntryTab = "solo";
  }
  syncP2PRoomAccordionUI();
  updateP2PLobbyUI();
}

function setHubEntryTab(tabKey) {
  state.hubEntryTab = tabKey || "solo";
  if (tabKey === "host" || tabKey === "join" || state.roomCode || state.aiRivalActive) {
    state.p2pPanelExpanded = true;
  } else if (tabKey === "solo" && !state.roomCode && !state.aiRivalActive) {
    state.p2pPanelExpanded = false;
  }

  if (state.hubEntryTab === "join" && !state.roomCode) {
    const chkSpec = document.getElementById("chk-p2p-join-spectate");
    if (chkSpec) chkSpec.checked = true;
  }

  syncP2PRoomAccordionUI();
  updateP2PLobbyUI();
}

function openGameHubModal(defaultTab = null) {
  if (state.selectedCounties.size > 0 && state.quizStationLines.size > 0) {
    state.quizTargetMode = "mixed";
  } else if (state.selectedCounties.size === 0 && state.quizStationLines.size > 0) {
    state.quizTargetMode = "station";
  } else {
    state.quizTargetMode = "region";
  }

  if (defaultTab) {
    setHubEntryTab(defaultTab);
  } else if (state.roomCode || state.aiRivalActive) {
    setHubEntryTab(state.isHost ? "host" : "join");
  } else {
    syncP2PRoomAccordionUI();
    updateP2PLobbyUI();
  }
  renderScopeModalGrid();

  const modal = document.getElementById("modal-scope");
  if (modal) modal.classList.remove("hidden");
  syncModalBodyScrollLock();
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function openUnlockedAndHelpModal(mode) {
  const modal = document.getElementById("modal-info");
  const title = document.getElementById("modal-info-title");
  const paneList = document.getElementById("info-pane-list");
  const paneHelp = document.getElementById("info-pane-help");
  if (!modal) return;
  modal.classList.remove("hidden");

  if (mode === "list") {
    const vState = typeof getActiveViewState === "function" ? getActiveViewState() : state;
    if (title) {
      title.textContent = vState.spectatingPlayer
        ? `👁️ 【${vState.spectatingPlayer.name}】已解鎖行政區一覽表`
        : "已解鎖行政區一覽表 (未解鎖名稱自動隱藏防劇透)";
    }
    if (paneHelp) paneHelp.classList.add("hidden");
    if (paneList) paneList.classList.remove("hidden");

    const unlockedList = getScopeTowns().filter((t) => vState.unlockedTowns.has(t.id));
    const remainingList = getScopeTowns().filter((t) => !vState.unlockedTowns.has(t.id));

    const uTitle = document.getElementById("unlocked-list-title");
    const uChips = document.getElementById("unlocked-list-chips");
    const rTitle = document.getElementById("remaining-list-title");
    const rChips = document.getElementById("remaining-list-chips");

    if (uTitle) uTitle.textContent = `✅ 已答對 (${unlockedList.length})`;
    if (uChips) {
      uChips.replaceChildren();
      if (unlockedList.length === 0) {
        const sp = document.createElement("span");
        sp.className = "text-slate-400 text-xs";
        sp.textContent = "尚無已解鎖行政區";
        uChips.appendChild(sp);
      } else {
        unlockedList.forEach((t) => {
          const sp = document.createElement("span");
          sp.className = "px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 text-xs";
          sp.textContent = t.fullHierarchyName;
          uChips.appendChild(sp);
        });
      }
    }

    if (rTitle) rTitle.textContent = `🔒 尚未解鎖剩餘數量：${remainingList.length} 區`;
    if (rChips) {
      rChips.replaceChildren();
      if (vState.isGameOver) {
        remainingList.forEach((t) => {
          const sp = document.createElement("span");
          sp.className = "inline-block m-0.5 px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 text-xs";
          sp.textContent = t.fullHierarchyName;
          rChips.appendChild(sp);
        });
      } else {
        rChips.textContent =
          "為避免洩漏未解鎖的縣市與鄉鎮答案，遊戲進行中不顯示未解鎖清單；點擊下方「結束並看答案」即可全數揭曉。";
      }
    }
  } else {
    if (title) title.textContent = "規則說明、多人觀戰模式與顯示優化指南";
    if (paneList) paneList.classList.add("hidden");
    if (paneHelp) paneHelp.classList.remove("hidden");
  }
}

function bindAllUIEvents() {
  document.querySelectorAll(".layer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMapBaseLayer(btn.getAttribute("data-layer"));
    });
  });

  function setDistrictBordersVisible(visible) {
    state.showDistrictBorders = visible;
    const bBtn = document.getElementById("btn-toggle-borders");
    if (bBtn) {
      const sp = bBtn.querySelector("span") || bBtn;
      sp.textContent = `🗺️ 區界: ${visible ? "開" : "關"}`;
      bBtn.className = visible
        ? "apple-glass-pill px-2 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold text-emerald-300 border border-emerald-500/35 bg-emerald-500/15 hover:bg-emerald-500/25 transition flex items-center gap-1 whitespace-nowrap"
        : "apple-glass-pill px-2 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-medium text-slate-400 border border-slate-700 hover:bg-slate-800 transition flex items-center gap-1 whitespace-nowrap";
    }
    const chkModal = document.getElementById("chk-modal-borders");
    if (chkModal) chkModal.checked = visible;
    if (countyBorderLayerGroup && map) {
      if (visible) {
        if (!map.hasLayer(countyBorderLayerGroup)) countyBorderLayerGroup.addTo(map);
      } else {
        if (map.hasLayer(countyBorderLayerGroup)) map.removeLayer(countyBorderLayerGroup);
      }
    }
    refreshAllPolygonStyles();
  }

  function renderTransportModalChecklist() {
    const container = document.getElementById("transport-lines-checklist");
    if (!container) return;

    document.querySelectorAll(".tmode-btn").forEach((btn) => {
      const isCur = btn.getAttribute("data-tmode") === state.transportMode;
      btn.className = isCur
        ? "tmode-btn p-2 rounded-xl border border-amber-400 bg-amber-500/20 text-left transition"
        : "tmode-btn p-2 rounded-xl border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-left transition";
    });

    const chkLegacySt = document.getElementById("chk-enable-legacy-stations-only");
    const btnLegacySt = document.getElementById("btn-tmode-stations-only");
    const tmodeGrid = document.getElementById("transport-mode-grid");
    if (chkLegacySt) chkLegacySt.checked = Boolean(state.enableLegacyStationOnlyMode);
    if (btnLegacySt) btnLegacySt.classList.toggle("hidden", !state.enableLegacyStationOnlyMode);
    if (tmodeGrid) {
      tmodeGrid.className = state.enableLegacyStationOnlyMode
        ? "grid grid-cols-1 sm:grid-cols-4 gap-2"
        : "grid grid-cols-1 sm:grid-cols-3 gap-2";
    }

    const chkHideMrt = document.getElementById("chk-hide-mrt-lines-openrail");
    if (chkHideMrt) chkHideMrt.checked = Boolean(state.hideMrtLinesOnOpenRail);
    const chkRawRail = document.getElementById("chk-raw-rail-tile");
    if (chkRawRail) chkRawRail.checked = Boolean(state.showRawOpenRailwayTile);
    const chkTerminusTrans = document.getElementById("chk-transport-terminus-hints");
    if (chkTerminusTrans) chkTerminusTrans.checked = Boolean(state.showStationTerminusHints);

    renderLineChecklistView(container, state.selectedTransportLines, true, "sky", (lineIds, shouldAdd) => {
      lineIds.forEach((id) => {
        if (shouldAdd) state.selectedTransportLines.add(id);
        else state.selectedTransportLines.delete(id);
      });
      renderTransportModalChecklist();
    });

    const sumEl = document.getElementById("transport-selected-summary");
    if (sumEl) {
      sumEl.textContent = `已勾選 ${state.selectedTransportLines.size} / ${TAIWAN_SELECTABLE_LINES.length} 條路線與系統`;
    }
  }

  document.getElementById("btn-toggle-rail").addEventListener("click", () => {
    // Spectators are exempt from p2pRailRule bans!
    const effectiveRailRule = state.role === "spectator" ? "free" : state.p2pRailRule;

    if (effectiveRailRule === "ban_rail") {
      const hasStations = Boolean(state.stationQuizEnabled && state.quizStationLines.size > 0);
      if (hasStations) {
        state.transportMode = state.transportMode === "stations_only" ? "off" : "stations_only";
        updateRoadAndRailwayTileOverlays();
        refreshAllPolygonStyles();
        setFeedback(
          state.transportMode === "stations_only"
            ? "🚉 已開啟「僅車站」模式 (僅顯示車站點位，軌道與公路路網已禁用)"
            : "🚫 已關閉路網與車站疊圖",
          "info"
        );
        return;
      }
      setFeedback("🔒 本場對戰房主已禁用 (Ban) 所有路網與車站！", "warn");
      return;
    }
    if (effectiveRailRule === "force_lines" || effectiveRailRule === "force_rail_only") {
      setFeedback("🔒 本場對戰房主已強制鎖定路網模式！", "warn");
      return;
    }
    if (effectiveRailRule === "ban_roads_only") {
      state.transportMode = state.transportMode === "rail_only" ? "off" : "rail_only";
      updateRoadAndRailwayTileOverlays();
      refreshAllPolygonStyles();
      setFeedback(
        state.transportMode === "rail_only"
          ? "🚄 已開啟「純軌道路網」模式 (線路+車站，公路已禁用)"
          : "🚫 已關閉路網與車站疊圖",
        "info"
      );
      return;
    }

    const order = state.enableLegacyStationOnlyMode
      ? ["off", "rail_only", "lines_and_stations", "stations_only"]
      : ["off", "rail_only", "lines_and_stations"];
    const curIdx = order.indexOf(state.transportMode);
    const nextMode = curIdx >= 0 ? order[(curIdx + 1) % order.length] : "off";
    state.transportMode = nextMode;
    updateRoadAndRailwayTileOverlays();
    refreshAllPolygonStyles();
    const modeDesc =
      nextMode === "rail_only"
        ? "🚄 已開啟「純軌道路網」模式 (軌道線路+車站點位，100% 排除公路雜訊)"
        : nextMode === "lines_and_stations"
        ? "🛣️ 已開啟「完整路網」模式 (軌道+各線車站+公路盾牌)"
        : nextMode === "stations_only"
        ? "📍 已開啟舊版「僅車站」模式 (僅顯示車站圓點，不顯示路線)"
        : "🚫 已關閉路網與車站疊圖";
    setFeedback(modeDesc, "info");
  });

  const chkLegacySt = document.getElementById("chk-enable-legacy-stations-only");
  const btnLegacySt = document.getElementById("btn-tmode-stations-only");
  const tmodeGrid = document.getElementById("transport-mode-grid");
  if (chkLegacySt) {
    chkLegacySt.addEventListener("change", (e) => {
      state.enableLegacyStationOnlyMode = e.target.checked;
      if (btnLegacySt) btnLegacySt.classList.toggle("hidden", !state.enableLegacyStationOnlyMode);
      if (tmodeGrid) {
        tmodeGrid.className = state.enableLegacyStationOnlyMode
          ? "grid grid-cols-1 sm:grid-cols-4 gap-2"
          : "grid grid-cols-1 sm:grid-cols-3 gap-2";
      }
      if (!state.enableLegacyStationOnlyMode && state.transportMode === "stations_only") {
        state.transportMode = "rail_only";
        renderTransportModalChecklist();
        updateRoadAndRailwayTileOverlays();
        refreshAllPolygonStyles();
      }
    });
  }

  document.getElementById("btn-open-transport-cfg").addEventListener("click", () => {
    const effectiveRailRule = state.role === "spectator" ? "free" : state.p2pRailRule;
    if (effectiveRailRule === "ban_rail") {
      const hasStations = Boolean(state.stationQuizEnabled && state.quizStationLines.size > 0);
      if (!hasStations) {
        setFeedback("🚫 本場對戰已禁用 (Ban) 路網與車站模式！", "warn");
        return;
      }
    }
    renderTransportModalChecklist();
    document.getElementById("modal-transport").classList.remove("hidden");
  });

  document.getElementById("btn-close-transport").addEventListener("click", () => {
    document.getElementById("modal-transport").classList.add("hidden");
  });

  document.getElementById("btn-apply-transport").addEventListener("click", () => {
    document.getElementById("modal-transport").classList.add("hidden");
    if (state.quizTargetMode !== "region" && canLocalModifyGameConfig()) {
      const railSelected = Array.from(state.selectedTransportLines).filter((id) => !id.startsWith("hw_"));
      if (state.transportMode !== "off" && railSelected.length > 0) {
        state.quizStationLines = new Set(railSelected);
        state.stationQuizEnabled = true;
      } else if (state.transportMode === "off") {
        state.stationQuizEnabled = false;
      }
    }
    updateRoadAndRailwayTileOverlays();
    refreshAllPolygonStyles();
    updateScoreAndProgressUI();
  });

  document.querySelectorAll(".tmode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.transportMode = btn.getAttribute("data-tmode");
      renderTransportModalChecklist();
      updateRoadAndRailwayTileOverlays();
      refreshAllPolygonStyles();
    });
  });

  document.getElementById("btn-toggle-borders").addEventListener("click", () => {
    setDistrictBordersVisible(!state.showDistrictBorders);
  });

  document.getElementById("chk-modal-borders").addEventListener("change", (e) => {
    setDistrictBordersVisible(e.target.checked);
  });

  document.getElementById("chk-show-station-names").addEventListener("change", (e) => {
    state.showStationNames = e.target.checked;
    updateRoadAndRailwayTileOverlays();
  });

  const chkHideMrt = document.getElementById("chk-hide-mrt-lines-openrail");
  if (chkHideMrt) {
    chkHideMrt.addEventListener("change", (e) => {
      state.hideMrtLinesOnOpenRail = e.target.checked;
      updateRoadAndRailwayTileOverlays();
    });
  }

  const handleTerminusToggle = (checked) => {
    if (!canLocalModifyGameConfig()) return;
    if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
      requestOrApplyConfigChange({ showStationTerminusHints: checked }, "頭尾端點站提示");
      return;
    }
    state.showStationTerminusHints = checked;
    const c1 = document.getElementById("chk-station-terminus-hints");
    const c2 = document.getElementById("chk-transport-terminus-hints");
    if (c1) c1.checked = checked;
    if (c2) c2.checked = checked;
    renderScopeModalGrid();
    renderTransportModalChecklist();
    if (typeof updateRoadAndRailwayTileOverlays === "function") updateRoadAndRailwayTileOverlays();
    if (state.targetStationKey && typeof updateTargetBannerUI === "function") updateTargetBannerUI();
    if (state.isHost && state.roomCode) onHostSettingChange("頭尾端點站提示");
  };

  document.getElementById("chk-station-terminus-hints")?.addEventListener("change", (e) => handleTerminusToggle(e.target.checked));
  document.getElementById("chk-transport-terminus-hints")?.addEventListener("change", (e) => handleTerminusToggle(e.target.checked));

  // Transport Preset Buttons
  document.getElementById("btn-tpreset-all").addEventListener("click", () => {
    state.selectedTransportLines = new Set(TAIWAN_SELECTABLE_LINES.map((l) => l.id));
    if (state.transportMode === "off") state.transportMode = "lines_and_stations";
    renderTransportModalChecklist();
  });
  document.getElementById("btn-tpreset-pure-rail")?.addEventListener("click", () => {
    state.selectedTransportLines = new Set(TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway).map((l) => l.id));
    state.transportMode = "rail_only";
    renderTransportModalChecklist();
    updateRoadAndRailwayTileOverlays();
    refreshAllPolygonStyles();
    setFeedback("🚄 已套用「純軌道路網」預設組合 (100% 排除公路雜訊，線路+車站點)", "info");
  });
  document.getElementById("btn-tpreset-rail-all").addEventListener("click", () => {
    state.selectedTransportLines = new Set(TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway).map((l) => l.id));
    if (state.transportMode === "off") state.transportMode = "lines_and_stations";
    renderTransportModalChecklist();
  });
  document.getElementById("btn-tpreset-tra").addEventListener("click", () => {
    state.selectedTransportLines = new Set(TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("tra_")).map((l) => l.id));
    if (state.transportMode === "off") state.transportMode = "lines_and_stations";
    renderTransportModalChecklist();
  });
  document.getElementById("btn-tpreset-mrt-lrt").addEventListener("click", () => {
    state.selectedTransportLines = new Set(
      TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("mrt_") || l.id.startsWith("lrt_") || l.id.startsWith("gon_")).map((l) => l.id)
    );
    if (state.transportMode === "off") state.transportMode = "lines_and_stations";
    renderTransportModalChecklist();
  });
  document.getElementById("btn-tpreset-heritage").addEventListener("click", () => {
    state.selectedTransportLines = new Set(
      TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("for_") || l.id.startsWith("sug_") || l.id.startsWith("gon_")).map((l) => l.id)
    );
    if (state.transportMode === "off") state.transportMode = "lines_and_stations";
    renderTransportModalChecklist();
  });
  document.getElementById("btn-tpreset-highway").addEventListener("click", () => {
    state.selectedTransportLines = new Set(TAIWAN_SELECTABLE_LINES.filter((l) => l.isHighway).map((l) => l.id));
    if (state.transportMode === "off") state.transportMode = "lines_and_stations";
    renderTransportModalChecklist();
  });
  document.getElementById("btn-tpreset-none").addEventListener("click", () => {
    state.selectedTransportLines.clear();
    renderTransportModalChecklist();
  });

  document.getElementById("btn-leader-mode").addEventListener("click", () => {
    const modes = ["smart", "all_callout", "inline_only"];
    const labels = {
      smart: "標註: 智慧內嵌+拉線",
      all_callout: "標註: 強制外圍拉線",
      inline_only: "標註: 僅內嵌文字"
    };
    const nextIdx = (modes.indexOf(state.leaderLineMode) + 1) % modes.length;
    state.leaderLineMode = modes[nextIdx];
    document.getElementById("leader-mode-label").textContent = labels[state.leaderLineMode];
    renderSmartLabelsAndLeaderLines();
  });

  document.getElementById("btn-view-all").addEventListener("click", () => resetToFullTaiwanView());
  document.getElementById("btn-mobile-jump-toggle")?.addEventListener("click", () => {
    const list = document.getElementById("quick-jump-list");
    if (list) {
      list.classList.toggle("hidden");
      list.classList.toggle("flex");
    }
  });
  document.getElementById("btn-reset-view-side").addEventListener("click", () => resetToFullTaiwanView());
  document.getElementById("btn-view-north").addEventListener("click", () => map.flyTo([25.04, 121.52], 11, { duration: 0.5 }));
  document.getElementById("btn-view-kinmen").addEventListener("click", () => map.flyTo([24.44, 118.36], 11, { duration: 0.5 }));
  document.getElementById("btn-view-matsu").addEventListener("click", () => map.flyTo([26.16, 119.95], 11, { duration: 0.5 }));
  document.getElementById("btn-view-penghu").addEventListener("click", () => map.flyTo([23.57, 119.61], 11, { duration: 0.5 }));

  document.getElementById("btn-zoom-in").addEventListener("click", () => map && map.zoomIn());
  document.getElementById("btn-zoom-out").addEventListener("click", () => map && map.zoomOut());

  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => setDifficulty(btn.getAttribute("data-diff")));
  });
  document.querySelectorAll(".playmode-btn").forEach((btn) => {
    btn.addEventListener("click", () => setPlayMode(btn.getAttribute("data-playmode")));
  });

  document.querySelectorAll(".hub-timer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!canLocalModifyGameConfig()) return;
      const mode = btn.getAttribute("data-timermode") || "up";
      const sec = parseInt(btn.getAttribute("data-sec"), 10) || 300;
      if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
        requestOrApplyConfigChange({ timerMode: mode, countdownTotalSec: sec }, "計時模式");
        return;
      }
      state.timerMode = mode;
      state.countdownTotalSec = sec;
      document.getElementById("btn-timer-mode").textContent =
        mode === "up" ? "正計時" : `倒數 ${Math.round(sec / 60)}m`;
      syncConfigButtonsUI();
      resetGame();
      if (state.isHost && state.roomCode) onHostSettingChange("計時模式");
    });
  });

  document.getElementById("btn-target-next").addEventListener("click", () => pickNextTargetRegion());
  document.getElementById("btn-target-hint").addEventListener("click", () => giveTargetHint());
  document.getElementById("btn-dir-n").addEventListener("click", () => moveTargetByDirection("N"));
  document.getElementById("btn-dir-s").addEventListener("click", () => moveTargetByDirection("S"));
  document.getElementById("btn-dir-w").addEventListener("click", () => moveTargetByDirection("W"));
  document.getElementById("btn-dir-e").addEventListener("click", () => moveTargetByDirection("E"));

  window.addEventListener("keydown", (e) => {
    if (e.isComposing || state.isImeComposing) return;
    const tag = document.activeElement ? document.activeElement.tagName : "";
    const activeId = document.activeElement ? document.activeElement.id : "";
    if (tag === "INPUT" && activeId !== "answer-input") return;

    const inputEl = document.getElementById("answer-input");
    if (!inputEl || inputEl.value.length > 0) return;

    const suffixList = ["", "區", "鄉", "鎮", "市", "站"];
    const suffixInputEl = document.getElementById("suffix-input");
    const prefixSelectEl = document.getElementById("prefix-select");

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const curSuffix = suffixInputEl ? suffixInputEl.value : "";
      let idx = suffixList.indexOf(curSuffix);
      if (idx === -1) idx = 0;
      const step = e.key === "ArrowRight" ? 1 : -1;
      const nextIdx = (idx + step + suffixList.length) % suffixList.length;
      const nextSuffix = suffixList[nextIdx];
      if (suffixInputEl) suffixInputEl.value = nextSuffix;
      document.querySelectorAll(".suffix-quick-btn").forEach((b) => {
        b.className =
          b.getAttribute("data-suffix") === nextSuffix
            ? "suffix-quick-btn px-1.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500 text-white"
            : "suffix-quick-btn px-1.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white";
      });
      updateLiveCombinedPreview();
      setFeedback(`🏷️ 左右鍵快速切換後綴：「${nextSuffix || "無後綴"}」`, "info");
      inputEl.focus({ preventScroll: true });
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (!prefixSelectEl || prefixSelectEl.options.length <= 1) return;
      e.preventDefault();
      const totalOpts = prefixSelectEl.options.length;
      const curIdx = prefixSelectEl.selectedIndex >= 0 ? prefixSelectEl.selectedIndex : 0;
      const step = e.key === "ArrowDown" ? 1 : -1;
      const nextIdx = (curIdx + step + totalOpts) % totalOpts;
      prefixSelectEl.selectedIndex = nextIdx;
      updateLiveCombinedPreview();
      const opt = prefixSelectEl.options[nextIdx];
      const chosenText = (opt && opt.value) || "無固定前綴";
      setFeedback(`📍 上下鍵快速切換縣市前綴：「${chosenText}」`, "info");
      inputEl.focus({ preventScroll: true });
    }
  });

  // ============================================================================
  // WINDOWS IME COMPOSITION-SAFE INPUT HANDLING
  // ============================================================================
  const answerInput = document.getElementById("answer-input");
  const prefixSelect = document.getElementById("prefix-select");
  const suffixInput = document.getElementById("suffix-input");

  answerInput.addEventListener("compositionstart", () => {
    state.isImeComposing = true;
  });

  answerInput.addEventListener("compositionend", () => {
    state.isImeComposing = false;
    updateLiveCombinedPreview();
    if (document.getElementById("chk-auto-submit").checked) {
      setTimeout(() => {
        if (!state.isImeComposing && answerInput.value.trim()) {
          evaluateGuess(answerInput.value, true);
        }
      }, 15);
    }
  });

  answerInput.addEventListener("input", (e) => {
    if (e.isComposing || state.isImeComposing) return;
    updateLiveCombinedPreview();
    if (document.getElementById("chk-auto-submit").checked) {
      evaluateGuess(answerInput.value, true);
    }
  });

  document.getElementById("answer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.isImeComposing || state.role === "spectator") return;
    evaluateGuess(answerInput.value, false);
  });

  prefixSelect.addEventListener("change", () => {
    updateLiveCombinedPreview();
    answerInput.focus({ preventScroll: true });
  });

  suffixInput.addEventListener("input", () => {
    updateLiveCombinedPreview();
  });

  document.querySelectorAll(".suffix-quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.getAttribute("data-suffix");
      suffixInput.value = s;
      document.querySelectorAll(".suffix-quick-btn").forEach((b) => {
        b.className =
          b.getAttribute("data-suffix") === s
            ? "suffix-quick-btn px-1.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500 text-white"
            : "suffix-quick-btn px-1.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white";
      });
      updateLiveCombinedPreview();
      answerInput.focus({ preventScroll: true });
    });
  });

  document.getElementById("btn-give-up").addEventListener("click", () => {
    if (state.role === "spectator") return;
    giveUpAndReveal();
  });
  document.getElementById("btn-restart").addEventListener("click", () => {
    if (state.role === "spectator") return;
    resetGame();
  });

  // Performance Settings Modal
  document.getElementById("btn-open-perf").addEventListener("click", () => {
    document.getElementById("modal-perf").classList.remove("hidden");
  });
  document.getElementById("btn-close-perf").addEventListener("click", () => {
    document.getElementById("modal-perf").classList.add("hidden");
  });
  document.getElementById("btn-apply-perf").addEventListener("click", () => {
    document.getElementById("modal-perf").classList.add("hidden");
    renderSmartLabelsAndLeaderLines();
  });
  document.getElementById("perf-drag-mode-select").addEventListener("change", (e) => {
    state.dragSyncMode = e.target.value;
  });
  document.getElementById("perf-max-labels-range").addEventListener("input", (e) => {
    state.maxVisibleCallouts = parseInt(e.target.value, 10) || 0;
    document.getElementById("perf-max-labels-val").textContent = `${state.maxVisibleCallouts} 個`;
    renderSmartLabelsAndLeaderLines();
  });
  document.getElementById("perf-min-px-range").addEventListener("input", (e) => {
    state.minPolygonPixelSize = parseInt(e.target.value, 10) || 20;
    document.getElementById("perf-min-px-val").textContent = `${state.minPolygonPixelSize} px`;
    renderSmartLabelsAndLeaderLines();
  });
  document.getElementById("chk-perf-lite").addEventListener("change", (e) => {
    state.perfLiteMode = e.target.checked;
    document.body.classList.toggle("perf-lite", state.perfLiteMode);
  });

  // ============================================================================
  // UNIFIED GAME HUB & EXPANDABLE MULTIPLAYER ROOM PANEL
  // ============================================================================
  document.getElementById("btn-toggle-p2p-panel")?.addEventListener("click", () => {
    toggleP2PRoomPanel();
  });

  document.querySelectorAll(".hub-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-hub-tab");
      setHubEntryTab(tab);
    });
  });

  // Observe all modal overlays to keep body.modal-open scroll lock 100% synchronized
  const modalObserver = new MutationObserver(() => syncModalBodyScrollLock());
  MODAL_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    modalObserver.observe(el, { attributes: true, attributeFilter: ["class"] });
    // Prevent wheel/touch scroll on modal backdrop from chaining to background page
    el.addEventListener(
      "wheel",
      (ev) => {
        if (ev.target === el) {
          ev.preventDefault();
        }
      },
      { passive: false }
    );
  });
  syncModalBodyScrollLock();

  document.getElementById("btn-restore-session")?.addEventListener("click", () => {
    const saved = loadSavedSessionFromStorage();
    if (saved) resumeSavedRoomSession(saved);
  });
  document.getElementById("btn-dismiss-session")?.addEventListener("click", () => {
    clearSavedSessionFromStorage();
    document.getElementById("session-restore-banner")?.classList.add("hidden");
  });

  document.querySelectorAll(".qmode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!canLocalModifyGameConfig()) return;
      const qm = btn.getAttribute("data-qmode");
      let nextCounties = new Set(state.selectedCounties);
      let nextLines = new Set(state.quizStationLines);

      if (qm === "region") {
        nextLines.clear();
        if (nextCounties.size === 0) {
          nextCounties = new Set(TAIWAN_ADMIN_DATA.map((c) => c.name));
        }
      } else if (qm === "station") {
        nextCounties.clear();
        if (nextLines.size === 0) {
          nextLines = new Set(
            TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("mrt_tpe_") || l.id === "mrt_ntpc_y").map((l) => l.id)
          );
        }
      } else if (qm === "mixed") {
        if (nextCounties.size === 0) {
          nextCounties = new Set(TAIWAN_ADMIN_DATA.map((c) => c.name));
        }
        if (nextLines.size === 0) {
          nextLines = new Set(
            TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("mrt_tpe_") || l.id === "mrt_ntpc_y" || l.id.startsWith("tra_")).map((l) => l.id)
          );
        }
      }

      if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
        requestOrApplyConfigChange(
          {
            quizTargetMode: qm,
            selectedCounties: Array.from(nextCounties),
            quizStationLines: Array.from(nextLines)
          },
          "挑戰主模式"
        );
        return;
      }

      state.quizTargetMode = qm;
      state.selectedCounties = nextCounties;
      state.quizStationLines = nextLines;
      state.stationQuizEnabled = state.quizStationLines.size > 0;
      renderScopeModalGrid();
      if (state.isHost && state.roomCode) onHostSettingChange("挑戰主模式");
    });
  });

  document.getElementById("btn-open-scope")?.addEventListener("click", () => openGameHubModal());
  document.getElementById("btn-open-scope-inline")?.addEventListener("click", () => openGameHubModal());
  document.getElementById("btn-open-p2p")?.addEventListener("click", () => {
    openGameHubModal(state.roomCode ? (state.isHost ? "host" : "join") : "host");
  });
  document.getElementById("btn-spectator-open-hub")?.addEventListener("click", () => {
    openGameHubModal(state.isHost ? "host" : "join");
  });
  document.getElementById("btn-close-scope").addEventListener("click", () => {
    document.getElementById("modal-scope").classList.add("hidden");
  });

  // Scope Preset Helper (Routes through consensus vote when Host has active players)
  const applyCountyScopeSelection = (countyNamesArray) => {
    if (!canLocalModifyGameConfig()) return;
    if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
      requestOrApplyConfigChange({ selectedCounties: countyNamesArray }, "行政區範圍");
      return;
    }
    state.selectedCounties = new Set(countyNamesArray);
    renderScopeModalGrid();
    if (state.isHost && state.roomCode) onHostSettingChange("行政區範圍");
  };

  document.getElementById("btn-scope-all").addEventListener("click", () => {
    applyCountyScopeSelection(TAIWAN_ADMIN_DATA.map((c) => c.name));
  });
  document.getElementById("btn-scope-six").addEventListener("click", () => {
    applyCountyScopeSelection(TAIWAN_ADMIN_DATA.filter((c) => c.isSpecial).map((c) => c.name));
  });
  document.getElementById("btn-scope-north").addEventListener("click", () => {
    applyCountyScopeSelection(TAIWAN_ADMIN_DATA.filter((c) => c.region === "north").map((c) => c.name));
  });
  document.getElementById("btn-scope-central").addEventListener("click", () => {
    applyCountyScopeSelection(TAIWAN_ADMIN_DATA.filter((c) => c.region === "central").map((c) => c.name));
  });
  document.getElementById("btn-scope-south").addEventListener("click", () => {
    applyCountyScopeSelection(TAIWAN_ADMIN_DATA.filter((c) => c.region === "south").map((c) => c.name));
  });
  document.getElementById("btn-scope-east").addEventListener("click", () => {
    applyCountyScopeSelection(TAIWAN_ADMIN_DATA.filter((c) => c.region === "east").map((c) => c.name));
  });
  document.getElementById("btn-scope-islands").addEventListener("click", () => {
    applyCountyScopeSelection(["澎湖縣", "金門縣", "連江縣"]);
  });
  document.getElementById("btn-scope-random-one").addEventListener("click", () => {
    const pick = TAIWAN_ADMIN_DATA[Math.floor(Math.random() * TAIWAN_ADMIN_DATA.length)];
    applyCountyScopeSelection([pick.name]);
  });
  document.getElementById("btn-scope-clear").addEventListener("click", () => {
    applyCountyScopeSelection([]);
  });

  // Station Quiz Quick Presets inside Unified Hub
  const setQuizLines = (predicate) => {
    if (!canLocalModifyGameConfig()) return;
    const lineIds = predicate
      ? TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway && predicate(l)).map((l) => l.id)
      : [];
    if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
      requestOrApplyConfigChange({ quizStationLines: lineIds }, "車站題庫");
      return;
    }
    state.quizStationLines = new Set(lineIds);
    state.stationQuizEnabled = state.quizStationLines.size > 0;
    renderScopeModalGrid();
    if (state.isHost && state.roomCode) onHostSettingChange("車站題庫");
  };

  document.getElementById("btn-qst-none").addEventListener("click", () => setQuizLines(null));
  document.getElementById("btn-qst-tpemrt").addEventListener("click", () => {
    setQuizLines((l) => l.id.startsWith("mrt_tpe_") || l.id === "mrt_ntpc_y");
  });
  document.getElementById("btn-qst-allmrt").addEventListener("click", () => {
    setQuizLines((l) => l.id.startsWith("mrt_"));
  });
  document.getElementById("btn-qst-lrt").addEventListener("click", () => {
    setQuizLines((l) => l.id.startsWith("lrt_"));
  });
  document.getElementById("btn-qst-tra-all").addEventListener("click", () => {
    setQuizLines((l) => l.id.startsWith("tra_"));
  });
  document.getElementById("btn-qst-tra-east").addEventListener("click", () => {
    setQuizLines((l) => ["tra_yilan", "tra_north_link", "tra_taitung"].includes(l.id));
  });
  document.getElementById("btn-qst-tra-branch").addEventListener("click", () => {
    setQuizLines((l) => ["tra_pingxi", "tra_neiwan", "tra_jiji", "tra_shalun", "tra_chengzhui"].includes(l.id));
  });
  document.getElementById("btn-qst-thsr").addEventListener("click", () => {
    setQuizLines((l) => l.id === "thsr_main");
  });
  document.getElementById("btn-qst-heritage").addEventListener("click", () => {
    setQuizLines((l) => l.id.startsWith("for_") || l.id.startsWith("sug_") || l.id.startsWith("gon_"));
  });
  document.getElementById("btn-qst-all").addEventListener("click", () => {
    setQuizLines(() => true);
  });

  document.getElementById("chk-raw-rail-tile")?.addEventListener("change", (e) => {
    state.showRawOpenRailwayTile = e.target.checked;
    updateRoadAndRailwayTileOverlays();
  });

  document.getElementById("btn-apply-scope").addEventListener("click", () => {
    // If non-host in a room, just close the modal to view map
    if (state.roomCode && !state.isHost) {
      document.getElementById("modal-scope").classList.add("hidden");
      return;
    }

    if (state.selectedCounties.size === 0 && state.quizStationLines.size === 0) {
      setFeedback("⚠️ 請至少選擇 1 個縣市或 1 條車站路線作為挑戰題庫！", "warn");
      state.selectedCounties = new Set(["臺北市"]);
    }

    if (state.quizStationLines.size > 0) {
      state.stationQuizEnabled = true;
      const keepHw = state.selectedTransportLines.has("hw_freeway");
      state.selectedTransportLines = new Set(state.quizStationLines);
      if (keepHw && state.selectedCounties.size > 0) state.selectedTransportLines.add("hw_freeway");
      if (state.transportMode === "off") state.transportMode = "lines_and_stations";
    } else {
      state.stationQuizEnabled = false;
      state.transportMode = "off";
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
    document.getElementById("scope-summary-label").textContent = summaryLabel;
    document.getElementById("modal-scope").classList.add("hidden");
    resetGame();

    if (state.selectedCounties.size === 0 && activeSt.length > 0 && map) {
      const bounds = L.latLngBounds(activeSt.map((s) => [s.lat, s.lng]));
      if (bounds.isValid()) {
        map.flyToBounds(bounds.pad(0.18), { duration: 0.6, maxZoom: 13 });
      }
      setFeedback(`🚉 已開啟純猜車站挑戰 (共 ${state.quizStationLines.size} 條路線、${activeSt.length} 座車站)，直接輸入站名即可解鎖！`, "tier");
    }

    if (state.isHost && state.roomCode) {
      onHostSettingChange("題庫範圍");
    }
  });

  // ============================================================================
  // P2P LOBBY, DUAL INVITE LINKS, PASSWORD & VOTE CONTROLS
  // ============================================================================
  document.getElementById("btn-p2p-host").addEventListener("click", () => hostP2PRoom());
  document.getElementById("btn-p2p-join").addEventListener("click", () => joinP2PRoom());
  document.getElementById("btn-p2p-leave")?.addEventListener("click", () => leaveP2PRoom());

  document.getElementById("btn-p2p-switch-role")?.addEventListener("click", () => toggleSpectatorRole());
  document.getElementById("btn-spectator-join-next")?.addEventListener("click", () => toggleSpectatorRole());
  document.getElementById("spectator-player-select")?.addEventListener("change", (e) => {
    setSpectatingTarget(e.target.value);
  });

  // Host dynamic password update & Input shortcuts
  const onHostPasswordInput = (e) => {
    e.target.classList.remove("border-rose-500");
    if (state.isHost && state.roomCode) {
      state.roomPassword = e.target.value.trim();
      const roomTag = document.getElementById("p2p-room-tag");
      if (roomTag) roomTag.textContent = `房號: ${state.roomCode} (Host${state.roomPassword ? " 🔒" : ""})`;
      updateRoomShareLinksUI();
      saveActiveSessionToStorage();
    }
  };
  document.getElementById("p2p-password-input")?.addEventListener("input", onHostPasswordInput);
  document.getElementById("p2p-host-password-input")?.addEventListener("input", onHostPasswordInput);

  // Enter key support for quick join & host
  document.getElementById("p2p-room-code-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinP2PRoom();
  });
  document.getElementById("p2p-password-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") joinP2PRoom();
  });
  document.getElementById("p2p-host-password-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") hostP2PRoom();
  });

  const bindShareCopyButton = (btnId, inputId, labelText) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const input = document.getElementById(inputId);
      if (!input || !input.value || input.value.includes("尚未建立")) {
        setFeedback("⚠️ 請先建立或加入房間後再複製邀請連結！", "warn");
        return;
      }
      input.select();
      const origText = btn.textContent;
      const done = () => {
        btn.textContent = "✓ 已複製!";
        setTimeout(() => { btn.textContent = origText; }, 1400);
      };
      try {
        navigator.clipboard.writeText(input.value).then(done).catch(() => {
          document.execCommand("copy");
          done();
        });
      } catch (_) {
        document.execCommand("copy");
        done();
      }
      const statusEl = document.getElementById("p2p-modal-status");
      if (statusEl) statusEl.textContent = `已複製「${labelText}」！發送給好友即可直接進入`;
      setFeedback(`🔗 已複製「${labelText}」至剪貼簿！`, "success");
    });
  };

  bindShareCopyButton("btn-copy-p2p-url-spectate", "p2p-share-url-spectate", "👁️ 觀戰邀請連結");
  bindShareCopyButton("btn-copy-p2p-url-play", "p2p-share-url-play", "🎮 參賽邀請連結");
  bindShareCopyButton("btn-copy-p2p-url", "p2p-share-url", "房間邀請連結");

  document.getElementById("btn-p2p-toggle-ready").addEventListener("click", () => {
    toggleP2PReady();
  });

  document.getElementById("p2p-nickname-input").addEventListener("input", (e) => {
    state.nickname = e.target.value.trim() || "玩家";
    try { localStorage.setItem("tw_geomaster_nickname", state.nickname); } catch (_) {}
    updateP2PLobbyUI();
    if (state.roomCode) {
      sendP2PMessage("SYNC_READY_STATUS", { ready: state.isReady, name: state.nickname });
    }
  });

  // Fair Rules Change Listeners
  const handleLayerRuleChange = (label) => {
    if (!canLocalModifyGameConfig()) return;
    const lrule = document.getElementById("p2p-layer-rule-select").value;
    const flayer = document.getElementById("p2p-forced-layer-select").value;
    const rrule = document.getElementById("p2p-rail-rule-select").value;
    if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
      requestOrApplyConfigChange({ layerRule: lrule, forcedLayer: flayer, railRule: rrule }, label);
      return;
    }
    applyP2PLayerRule(lrule, flayer, rrule);
    if (state.isHost && state.roomCode) onHostSettingChange(label);
  };
  document.getElementById("p2p-layer-rule-select")?.addEventListener("change", () => handleLayerRuleChange("底圖限制"));
  document.getElementById("p2p-forced-layer-select")?.addEventListener("change", () => handleLayerRuleChange("指定底圖"));
  document.getElementById("p2p-rail-rule-select")?.addEventListener("change", () => handleLayerRuleChange("路網規則"));

  // Consensus Vote Modal Buttons
  document.getElementById("btn-vote-approve")?.addEventListener("click", () => submitConfigChangeVote(true));
  document.getElementById("btn-vote-reject")?.addEventListener("click", () => submitConfigChangeVote(false));
  document.getElementById("btn-vote-cancel")?.addEventListener("click", () => cancelHostConfigProposal());

  // Host Start Battle
  document.getElementById("btn-p2p-sync-start").addEventListener("click", () => {
    if (!state.isHost) return;
    const nonHostPlayers = typeof getNonHostBattlePlayers === "function" ? getNonHostBattlePlayers() : [];
    const hasOpponents = nonHostPlayers.length > 0 || state.aiRivalActive;
    if (!hasOpponents) {
      setFeedback("⚠️ 請等待至少一位參賽選手加入房間（觀戰者可點「切換參賽」加入）！", "warn");
      return;
    }
    const allReady =
      (nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.isReady)) ||
      (state.aiRivalActive && state.opponent.isReady);
    if (!allReady) {
      setFeedback("⚠️ 請等待所有參賽選手確認設定並點擊「準備」，再開始對戰！", "warn");
      return;
    }
    const payload = getHostSyncConfig(false);
    startSynchronizedP2PCountdown(payload, true);
  });
  document.getElementById("btn-quick-sim-rival").addEventListener("click", () => toggleAiRivalSimulation());

  // Settlement & Report Card Modal Events
  document.getElementById("btn-download-settlement")?.addEventListener("click", () => downloadSettlementCard());
  document.getElementById("btn-share-settlement")?.addEventListener("click", () => shareSettlementCard());
  document.getElementById("btn-return-lobby-settlement")?.addEventListener("click", () => {
    if (typeof requestReturnToLobby === "function") {
      requestReturnToLobby();
    }
  });
  document.getElementById("btn-rematch-settlement")?.addEventListener("click", () => requestP2PRematch());
  document.getElementById("btn-close-settlement")?.addEventListener("click", () => {
    document.getElementById("modal-settlement")?.classList.add("hidden");
    if (state.isGameOver) document.getElementById("btn-reopen-settlement")?.classList.remove("hidden");
  });
  document.getElementById("btn-review-map")?.addEventListener("click", () => {
    document.getElementById("modal-settlement")?.classList.add("hidden");
    if (state.isGameOver) document.getElementById("btn-reopen-settlement")?.classList.remove("hidden");
  });
  document.getElementById("btn-reopen-settlement")?.addEventListener("click", () => {
    showSettlementModal();
  });

  // Opponent Finished Choice Dialog
  document.getElementById("btn-opp-finish-continue")?.addEventListener("click", () => {
    document.getElementById("modal-opponent-finished")?.classList.add("hidden");
    setFeedback("⚔️ 其他選手已結束，你可繼續作答衝刺高分，或隨時點擊【結束並看答案】結算勝負！", "info");
  });
  document.getElementById("btn-opp-finish-settle")?.addEventListener("click", () => {
    document.getElementById("modal-opponent-finished")?.classList.add("hidden");
    finishGame("giveup");
  });

  // Rematch Confirmation Dialog
  document.getElementById("btn-rematch-accept")?.addEventListener("click", () => respondP2PRematch(true));
  document.getElementById("btn-rematch-decline")?.addEventListener("click", () => respondP2PRematch(false));

  // Timer Modal
  document.getElementById("btn-timer-mode").addEventListener("click", () => {
    if (!canLocalModifyGameConfig()) {
      setFeedback("🔒 多人連線模式下，僅房主可調整計時模式！", "warn");
      return;
    }
    document.getElementById("modal-timer").classList.remove("hidden");
  });
  document.getElementById("btn-close-timer").addEventListener("click", () => {
    document.getElementById("modal-timer").classList.add("hidden");
  });
  document.querySelectorAll(".timer-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!canLocalModifyGameConfig()) return;
      const mode = btn.getAttribute("data-timermode");
      const sec = parseInt(btn.getAttribute("data-sec"), 10) || 300;
      document.getElementById("modal-timer").classList.add("hidden");
      if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
        requestOrApplyConfigChange({ timerMode: mode, countdownTotalSec: sec }, "計時模式");
        return;
      }
      state.timerMode = mode;
      state.countdownTotalSec = sec;
      document.getElementById("btn-timer-mode").textContent =
        mode === "up" ? "正計時" : `倒數 ${Math.round(sec / 60)}m`;
      syncConfigButtonsUI();
      resetGame();
      if (state.isHost && state.roomCode) onHostSettingChange("計時模式");
    });
  });
  document.getElementById("btn-apply-custom-timer").addEventListener("click", () => {
    if (!canLocalModifyGameConfig()) return;
    const mins = Math.max(1, parseInt(document.getElementById("custom-countdown-min").value, 10) || 5);
    document.getElementById("modal-timer").classList.add("hidden");
    if (state.isHost && state.roomCode && getNonHostBattlePlayers().length > 0) {
      requestOrApplyConfigChange({ timerMode: "down", countdownTotalSec: mins * 60 }, "自訂倒數時間");
      return;
    }
    state.timerMode = "down";
    state.countdownTotalSec = mins * 60;
    document.getElementById("btn-timer-mode").textContent = `倒數 ${mins}m`;
    syncConfigButtonsUI();
    resetGame();
    if (state.isHost && state.roomCode) onHostSettingChange("自訂倒數時間");
  });

  // Audio & Info Modals
  document.getElementById("btn-audio-toggle").addEventListener("click", (e) => {
    state.soundEnabled = !state.soundEnabled;
    const icon = e.currentTarget.querySelector("[data-lucide]");
    if (icon) {
      icon.setAttribute("data-lucide", state.soundEnabled ? "volume-2" : "volume-x");
    }
    e.currentTarget.className = state.soundEnabled
      ? "p-1 sm:p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-400 border border-sky-500/40 transition"
      : "p-1 sm:p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-400 border border-slate-700 transition";
    e.currentTarget.title = state.soundEnabled ? "切換音效 (目前開啟)" : "切換音效 (目前靜音)";
    setFeedback(state.soundEnabled ? "🔊 已開啟音效" : "🔇 已靜音關閉音效", "info");
    if (window.lucide) lucide.createIcons();
  });
  document.getElementById("btn-toggle-unlocked-list").addEventListener("click", () => openUnlockedAndHelpModal("list"));
  document.getElementById("btn-open-help").addEventListener("click", () => openUnlockedAndHelpModal("help"));
  document.getElementById("btn-close-info").addEventListener("click", () => {
    document.getElementById("modal-info").classList.add("hidden");
  });
}

let _appBootstrapped = false;
function bootstrapGeoMasterApp() {
  if (_appBootstrapped) return;
  _appBootstrapped = true;
  if (window.lucide) lucide.createIcons();
  bindAllUIEvents();
  initMap();
  updatePrefixDropdownUI();
  updateScoreAndProgressUI();
  updateP2PPanelVisibility();
  initP2PEngine();
  initPrecisionRailAndStationEngine();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapGeoMasterApp);
  window.addEventListener("load", bootstrapGeoMasterApp);
} else {
  bootstrapGeoMasterApp();
}
