// =========================================================================
// 12. UI CONTROLS, PERFORMANCE SETTINGS & WINDOWS IME EVENT LISTENERS
// =========================================================================
function setDifficulty(diff) {
  state.difficulty = diff;
  document.querySelectorAll(".diff-btn").forEach((btn) => {
    const isCurrent = btn.getAttribute("data-diff") === diff;
    btn.className = isCurrent
      ? "diff-btn text-left p-2.5 rounded-xl border transition bg-sky-500/20 border-sky-400 text-white"
      : "diff-btn text-left p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/70 text-slate-300 transition";
  });
  updateModeBadgeText();
  resetGame();
  if (state.isHost && (state.opponent.connected || state.roomCode)) {
    broadcastP2PConfig(true);
  }
}

function setPlayMode(pm) {
  state.playMode = pm;
  document.querySelectorAll(".playmode-btn").forEach((btn) => {
    const isCurrent = btn.getAttribute("data-playmode") === pm;
    btn.className = isCurrent
      ? "playmode-btn py-2.5 px-3 rounded-xl text-xs font-bold border transition bg-emerald-500/20 border-emerald-400 text-emerald-200 text-center"
      : "playmode-btn py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-center transition";
  });
  updateModeBadgeText();
  if (pm === "target_random") {
    pickNextTargetRegion();
  } else {
    state.targetId = null;
    updateTargetBannerUI();
    refreshAllPolygonStyles();
  }
  if (state.isHost && (state.opponent.connected || state.roomCode)) {
    broadcastP2PConfig(true);
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
  document.getElementById("current-mode-pill").textContent = `${pmNames[state.playMode]} · ${diffNames[state.difficulty]}`;
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

function renderScopeModalGrid() {
  const grid = document.getElementById("scope-counties-grid");
  if (grid) {
    grid.innerHTML = "";
    TAIWAN_ADMIN_DATA.forEach((c) => {
      const selected = state.selectedCounties.has(c.name);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = selected
        ? "p-2 rounded-2xl border border-sky-400 bg-sky-500/20 text-left transition flex items-center justify-between"
        : "p-2 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-left transition flex items-center justify-between opacity-70";
      btn.innerHTML = `
        <div>
          <div class="text-xs font-bold text-white">${c.name}</div>
          <div class="text-[10px] text-slate-400">${c.province} · ${c.towns.length} 區</div>
        </div>
        <span class="w-4 h-4 rounded-md flex items-center justify-center text-xs ${selected ? "bg-sky-500 text-white" : "bg-slate-800 text-transparent"}">✓</span>
      `;
      btn.addEventListener("click", () => {
        if (state.selectedCounties.has(c.name)) {
          state.selectedCounties.delete(c.name);
        } else {
          state.selectedCounties.add(c.name);
        }
        renderScopeModalGrid();
      });
      grid.appendChild(btn);
    });
  }

  // Render Station Quiz Lines Checklist inside #modal-scope
  const stGrid = document.getElementById("scope-stations-grid");
  if (stGrid) {
    const chkTerminusScope = document.getElementById("chk-station-terminus-hints");
    if (chkTerminusScope) chkTerminusScope.checked = !!state.showStationTerminusHints;
    stGrid.innerHTML = "";
    const groups = new Map();
    TAIWAN_SELECTABLE_LINES.forEach((l) => {
      if (l.isHighway) return;
      if (!groups.has(l.group)) groups.set(l.group, []);
      groups.get(l.group).push(l);
    });

    groups.forEach((lines, groupTitle) => {
      const card = document.createElement("div");
      card.className = "p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5";
      const allChecked = lines.every((l) => state.quizStationLines.has(l.id));

      const header = document.createElement("div");
      header.className = "flex items-center justify-between border-b border-slate-800/80 pb-1";
      header.innerHTML = `
        <span class="text-xs font-bold text-slate-200">${groupTitle} (${lines.length}線)</span>
        <button type="button" class="text-[11px] text-pink-400 hover:text-pink-300 font-semibold">${allChecked ? "取消本類" : "全選本類"}</button>
      `;
      header.querySelector("button").addEventListener("click", () => {
        lines.forEach((l) => {
          if (allChecked) state.quizStationLines.delete(l.id);
          else state.quizStationLines.add(l.id);
        });
        renderScopeModalGrid();
      });
      card.appendChild(header);

      const itemsWrap = document.createElement("div");
      itemsWrap.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5";
      lines.forEach((l) => {
        const checked = state.quizStationLines.has(l.id);
        const item = document.createElement("label");
        item.className = `flex items-center gap-2 p-1.5 rounded-xl border cursor-pointer transition ${
          checked ? "bg-pink-500/15 border-pink-400/60 text-white" : "bg-slate-950/60 border-slate-800 text-slate-400"
        }`;
        const lineTitle = typeof getLineDisplayName === "function" ? getLineDisplayName(l) : l.name;
        item.innerHTML = `
          <input type="checkbox" ${checked ? "checked" : ""} class="rounded bg-slate-900 border-slate-600 text-pink-500" />
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${l.color}"></span>
          <span class="truncate text-[11px] font-medium">${lineTitle} (${l.stations.length}站)</span>
        `;
        item.querySelector("input").addEventListener("change", (ev) => {
          if (ev.target.checked) state.quizStationLines.add(l.id);
          else state.quizStationLines.delete(l.id);
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
  if (counterEl) {
    const adminPart =
      state.selectedCounties.size === 0
        ? "不猜行政區 (0區)"
        : `${state.selectedCounties.size} 縣市 (${totalTowns} 鄉鎮市區)`;
    const stPart =
      state.quizStationLines.size === 0
        ? "不猜車站 (0站)"
        : `${state.quizStationLines.size} 條路線 (${totalStations} 座車站)`;
    counterEl.textContent = `已選題庫：${adminPart} ＋ ${stPart}`;
  }

  if (typeof renderP2PHostSettingsUI === "function" && document.getElementById("p2p-host-settings")) {
    renderP2PHostSettingsUI();
  }
}

function openUnlockedAndHelpModal(mode) {
  const modal = document.getElementById("modal-info");
  const title = document.getElementById("modal-info-title");
  const body = document.getElementById("modal-info-body");
  modal.classList.remove("hidden");

  if (mode === "list") {
    title.textContent = "已解鎖行政區一覽表（未解鎖名稱自動隱藏防劇透）";
    const unlockedList = getScopeTowns().filter((t) => state.unlockedTowns.has(t.id));
    const remainingCount = getScopeTowns().length - unlockedList.length;
    body.innerHTML = `
      <div class="space-y-3">
        <div class="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
          <div class="font-bold text-emerald-300 mb-1.5">✅ 已答對 (${unlockedList.length})</div>
          <div class="flex flex-wrap gap-1.5">
            ${unlockedList.length ? unlockedList.map((t) => `<span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 text-xs">${t.fullHierarchyName}</span>`).join("") : `<span class="text-slate-400 text-xs">尚無已解鎖行政區</span>`}
          </div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div class="font-bold text-slate-300 mb-1">🔒 尚未解鎖剩餘數量：${remainingCount} 區</div>
          <p class="text-xs text-slate-400">${state.isGameOver ? getScopeTowns().filter((t) => !state.unlockedTowns.has(t.id)).map((t) => `<span class="inline-block m-0.5 px-2 py-0.5 rounded bg-rose-500/20 text-rose-200">${t.fullHierarchyName}</span>`).join("") : "為避免洩漏未解鎖的縣市與鄉鎮答案，遊戲進行中不顯示未解鎖清單；點擊下方「結束並看答案」即可全數揭曉。"}</p>
        </div>
      </div>
    `;
  } else {
    title.textContent = "規則說明、Windows 注音相容與顯示優化指南";
    body.innerHTML = `
      <div class="space-y-3 leading-relaxed">
        <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <h4 class="font-bold text-sky-300 mb-1">⌨️ Windows 注音輸入法虛線組字修正</h4>
          <p>系統已監聽瀏覽器 <code>compositionstart</code> / <code>compositionend</code> 與 <code>e.isComposing</code> 狀態：當你在打注音還在虛線選字階段（尚未按 Enter 確認組字）時，系統<strong>絕不會中途攔截或清空輸入框</strong>，必須等你按下 Enter 完成組字後才會觸發自動判定並乾淨清除，不再發生下一個字冒出舊殘留字元的問題！</p>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <h4 class="font-bold text-emerald-300 mb-1">⚡ 60FPS 硬體加速與「顯示優化」面板</h4>
          <p>368 個鄉鎮市區多邊形已全面改用 <strong>HTML5 Canvas 硬體加速渲染</strong>（取代耗能的 368 個 SVG DOM 節點），並嚴格剔除畫面外標籤、在縮小地圖時自動縮小字級與隱藏過小區塊。點擊上方「<strong>⚡ 顯示優化</strong>」可自由調整最大拉線數量、最小顯示像素閾值，以及切換「移動時暫時隱藏文字（零延遲）」或「移動時即時跟隨」。</p>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <h4 class="font-bold text-amber-300 mb-1">📚 資料與圖資來源</h4>
          <p>靈感致敬 <a href="https://cchsu.tw/projects/taipei-cities/" target="_blank" rel="noopener" class="text-sky-400 underline">台灣行政區大挑戰 (cchsu.tw)</a>，真實鄉鎮市區多邊形界線採用內政部開放資料 1:10,000 TopoJSON (<a href="https://github.com/dkaoster/taiwan-atlas" target="_blank" rel="noopener" class="text-sky-400 underline">taiwan-atlas@2021.9.20</a> / <a href="https://taiwan.md/taiwan-shape/" target="_blank" rel="noopener" class="text-sky-400 underline">Taiwan.md</a>)。</p>
        </div>
      </div>
    `;
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
      bBtn.innerHTML = `<span>🗺️ 區界: ${visible ? "開" : "關"}</span>`;
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
    container.innerHTML = "";

    // Update mode buttons
    document.querySelectorAll(".tmode-btn").forEach((btn) => {
      const isCur = btn.getAttribute("data-tmode") === state.transportMode;
      btn.className = isCur
        ? "tmode-btn p-2 rounded-xl border border-amber-400 bg-amber-500/20 text-left transition"
        : "tmode-btn p-2 rounded-xl border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-left transition";
    });

    const chkLegacySt = document.getElementById("chk-enable-legacy-stations-only");
    const btnLegacySt = document.getElementById("btn-tmode-stations-only");
    const tmodeGrid = document.getElementById("transport-mode-grid");
    if (chkLegacySt) chkLegacySt.checked = !!state.enableLegacyStationOnlyMode;
    if (btnLegacySt) btnLegacySt.classList.toggle("hidden", !state.enableLegacyStationOnlyMode);
    if (tmodeGrid) {
      tmodeGrid.className = state.enableLegacyStationOnlyMode
        ? "grid grid-cols-1 sm:grid-cols-4 gap-2"
        : "grid grid-cols-1 sm:grid-cols-3 gap-2";
    }

    const chkHideMrt = document.getElementById("chk-hide-mrt-lines-openrail");
    if (chkHideMrt) chkHideMrt.checked = !!state.hideMrtLinesOnOpenRail;
    const chkRawRail = document.getElementById("chk-raw-rail-tile");
    if (chkRawRail) chkRawRail.checked = !!state.showRawOpenRailwayTile;
    const chkTerminusTrans = document.getElementById("chk-transport-terminus-hints");
    if (chkTerminusTrans) chkTerminusTrans.checked = !!state.showStationTerminusHints;

    // Group lines by group name
    const groups = new Map();
    TAIWAN_SELECTABLE_LINES.forEach((l) => {
      if (!groups.has(l.group)) groups.set(l.group, []);
      groups.get(l.group).push(l);
    });

    groups.forEach((lines, groupTitle) => {
      const card = document.createElement("div");
      card.className = "p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2";
      const allChecked = lines.every((l) => state.selectedTransportLines.has(l.id));

      const header = document.createElement("div");
      header.className = "flex items-center justify-between border-b border-slate-800/80 pb-1.5";
      header.innerHTML = `
        <span class="font-bold text-slate-200">${groupTitle} (${lines.length})</span>
        <button type="button" class="text-[11px] text-sky-400 hover:text-sky-300 font-semibold">${allChecked ? "取消本類" : "全選本類"}</button>
      `;
      header.querySelector("button").addEventListener("click", () => {
        lines.forEach((l) => {
          if (allChecked) state.selectedTransportLines.delete(l.id);
          else state.selectedTransportLines.add(l.id);
        });
        renderTransportModalChecklist();
      });
      card.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5";
      lines.forEach((l) => {
        const checked = state.selectedTransportLines.has(l.id);
        const item = document.createElement("label");
        item.className = `flex items-center gap-2 p-1.5 rounded-xl border cursor-pointer transition ${
          checked ? "bg-slate-800/90 border-sky-500/40 text-white" : "bg-slate-950/60 border-slate-800 text-slate-400"
        }`;
        const lineTitle = typeof getLineDisplayName === "function" ? getLineDisplayName(l) : l.name;
        item.innerHTML = `
          <input type="checkbox" ${checked ? "checked" : ""} class="rounded bg-slate-900 border-slate-600 text-sky-500" />
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${l.color}"></span>
          <span class="truncate text-[11px] font-medium">${lineTitle}</span>
        `;
        item.querySelector("input").addEventListener("change", (ev) => {
          if (ev.target.checked) state.selectedTransportLines.add(l.id);
          else state.selectedTransportLines.delete(l.id);
          renderTransportModalChecklist();
        });
        grid.appendChild(item);
      });
      card.appendChild(grid);
      container.appendChild(card);
    });

    const sumEl = document.getElementById("transport-selected-summary");
    if (sumEl) {
      sumEl.textContent = `已勾選 ${state.selectedTransportLines.size} / ${TAIWAN_SELECTABLE_LINES.length} 條路線與系統`;
    }
  }

  document.getElementById("btn-toggle-rail").addEventListener("click", () => {
    if (state.p2pRailRule === "ban_rail") {
      const hasStations =
        (state.stationQuizEnabled && state.quizStationLines.size > 0) ||
        state.selectedTransportLines.size > 0 ||
        (typeof getActiveQuizStations === "function" && getActiveQuizStations().length > 0);
      if (hasStations) {
        state.transportMode = state.transportMode === "stations_only" ? "off" : "stations_only";
        updateRoadAndRailwayTileOverlays();
        refreshAllPolygonStyles();
        setFeedback(
          state.transportMode === "stations_only"
            ? "🚉 已開啟「僅車站」模式（僅顯示車站點位，軌道與公路路網已禁用）"
            : "🚫 已關閉路網與車站疊圖",
          "info"
        );
        return;
      }
      setFeedback("🔒 本場對戰房主已禁用 (Ban) 所有路網與車站！", "warn");
      return;
    }
    if (state.p2pRailRule === "force_lines" || state.p2pRailRule === "force_rail_only") {
      setFeedback("🔒 本場對戰房主已強制鎖定路網模式！", "warn");
      return;
    }
    if (state.p2pRailRule === "ban_roads_only") {
      // Toggle only between off and rail_only
      state.transportMode = state.transportMode === "rail_only" ? "off" : "rail_only";
      updateRoadAndRailwayTileOverlays();
      refreshAllPolygonStyles();
      setFeedback(
        state.transportMode === "rail_only"
          ? "🚄 已開啟「純軌道路網」模式（線路+車站，公路已禁用）"
          : "🚫 已關閉路網與車站疊圖",
        "info"
      );
      return;
    }

    // Normal Cycle: off -> rail_only -> lines_and_stations -> stations_only (only if legacy enabled) -> off
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
        ? "🚄 已開啟「純軌道路網」模式（軌道線路＋車站點位，100% 排除公路雜訊）"
        : nextMode === "lines_and_stations"
        ? "🛤️ 已開啟「完整路網」模式（軌道＋各線車站＋公路盾牌）"
        : nextMode === "stations_only"
        ? "📍 已開啟舊版「僅車站」模式（僅顯示車站圓點，不顯示路線）"
        : "🚫 已關閉路網與車站疊圖";
    setFeedback(modeDesc, "info");
  });

  // Legacy Stations-Only Mode Toggle Event
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
        setFeedback("已關閉舊版純車站模式，自動切換至純軌道路網", "info");
      }
    });
  }

  document.getElementById("btn-open-transport-cfg").addEventListener("click", () => {
    if (state.p2pRailRule === "ban_rail") {
      const hasStations =
        (state.stationQuizEnabled && state.quizStationLines.size > 0) ||
        state.selectedTransportLines.size > 0 ||
        (typeof getActiveQuizStations === "function" && getActiveQuizStations().length > 0);
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
    const railSelected = Array.from(state.selectedTransportLines).filter((id) => !id.startsWith("hw_"));
    if (state.transportMode !== "off" && railSelected.length > 0) {
      state.quizStationLines = new Set(railSelected);
      state.stationQuizEnabled = true;
    } else if (state.transportMode === "off") {
      state.stationQuizEnabled = false;
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
    state.showStationTerminusHints = checked;
    const c1 = document.getElementById("chk-station-terminus-hints");
    const c2 = document.getElementById("chk-transport-terminus-hints");
    if (c1) c1.checked = checked;
    if (c2) c2.checked = checked;
    renderScopeModalGrid();
    renderTransportModalChecklist();
    if (typeof updateRoadAndRailwayTileOverlays === "function") updateRoadAndRailwayTileOverlays();
    if (state.targetStationKey && typeof updateTargetBannerUI === "function") updateTargetBannerUI();
  };

  const chkTerminusScope = document.getElementById("chk-station-terminus-hints");
  if (chkTerminusScope) {
    chkTerminusScope.addEventListener("change", (e) => handleTerminusToggle(e.target.checked));
  }
  const chkTerminusTrans = document.getElementById("chk-transport-terminus-hints");
  if (chkTerminusTrans) {
    chkTerminusTrans.addEventListener("change", (e) => handleTerminusToggle(e.target.checked));
  }

  // Transport Preset Buttons
  document.getElementById("btn-tpreset-all").addEventListener("click", () => {
    state.selectedTransportLines = new Set(TAIWAN_SELECTABLE_LINES.map((l) => l.id));
    if (state.transportMode === "off") state.transportMode = "lines_and_stations";
    renderTransportModalChecklist();
  });
  const btnPureRail = document.getElementById("btn-tpreset-pure-rail");
  if (btnPureRail) {
    btnPureRail.addEventListener("click", () => {
      state.selectedTransportLines = new Set(TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway).map((l) => l.id));
      state.transportMode = "rail_only";
      renderTransportModalChecklist();
      updateRoadAndRailwayTileOverlays();
      refreshAllPolygonStyles();
      setFeedback("🚄 已套用「純軌道路網」預設組合（100% 排除公路雜訊，線路+車站點）", "info");
    });
  }
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
  const mobileJumpBtn = document.getElementById("btn-mobile-jump-toggle");
  if (mobileJumpBtn) {
    mobileJumpBtn.addEventListener("click", () => {
      const list = document.getElementById("quick-jump-list");
      if (list) {
        list.classList.toggle("hidden");
        list.classList.toggle("flex");
      }
    });
  }
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

  document.getElementById("btn-target-next").addEventListener("click", () => pickNextTargetRegion());
  document.getElementById("btn-target-hint").addEventListener("click", () => giveTargetHint());
  document.getElementById("btn-dir-n").addEventListener("click", () => moveTargetByDirection("N"));
  document.getElementById("btn-dir-s").addEventListener("click", () => moveTargetByDirection("S"));
  document.getElementById("btn-dir-w").addEventListener("click", () => moveTargetByDirection("W"));
  document.getElementById("btn-dir-e").addEventListener("click", () => moveTargetByDirection("E"));

  // Empty-Input Keyboard Quick Switcher:
  //  - Left / Right (when input is completely empty & not IME composing): cycle suffix [無 <-> 區 <-> 鄉 <-> 鎮 <-> 市 <-> 站] (wrap-around)
  //  - Up / Down (when input is completely empty & not IME composing): cycle County Prefix (#prefix-select) (wrap-around)
  //  - Disabled when input has any characters so IME cursor & candidate selection never conflict!
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

  // =====================================================================
  // WINDOWS IME COMPOSITION-SAFE INPUT HANDLING (解決微軟注音虛線殘留問題)
  // =====================================================================
  const answerInput = document.getElementById("answer-input");
  const prefixSelect = document.getElementById("prefix-select");
  const suffixInput = document.getElementById("suffix-input");

  answerInput.addEventListener("compositionstart", () => {
    state.isImeComposing = true;
  });

  answerInput.addEventListener("compositionend", () => {
    state.isImeComposing = false;
    updateLiveCombinedPreview();
    // Wait one microtask/frame after IME commits composition before checking
    if (document.getElementById("chk-auto-submit").checked) {
      setTimeout(() => {
        if (!state.isImeComposing && answerInput.value.trim()) {
          evaluateGuess(answerInput.value, true);
        }
      }, 15);
    }
  });

  answerInput.addEventListener("input", (e) => {
    if (e.isComposing || state.isImeComposing) {
      // Do NOT evaluate or clear while user still has dotted underline in Windows IME!
      return;
    }
    updateLiveCombinedPreview();
    if (document.getElementById("chk-auto-submit").checked) {
      evaluateGuess(answerInput.value, true);
    }
  });

  document.getElementById("answer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.isImeComposing) return;
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

  document.getElementById("btn-give-up").addEventListener("click", () => giveUpAndReveal());
  document.getElementById("btn-restart").addEventListener("click", () => resetGame());

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

  // Top-Level Quiz Mode Switcher (🗺️ 地區模式 / 🚉 車站模式 / 🔀 混合模式)
  const syncQuizModeTabsUI = () => {
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
  };

  document.querySelectorAll(".qmode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qm = btn.getAttribute("data-qmode");
      state.quizTargetMode = qm;
      if (qm === "region") {
        state.quizStationLines.clear();
        if (state.selectedCounties.size === 0) {
          state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.map((c) => c.name));
        }
      } else if (qm === "station") {
        state.selectedCounties.clear();
        if (state.quizStationLines.size === 0) {
          // Default to Taipei MRT 6 lines if none selected yet
          state.quizStationLines = new Set(
            TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("mrt_tpe_") || l.id === "mrt_ntpc_y").map((l) => l.id)
          );
        }
      } else if (qm === "mixed") {
        if (state.selectedCounties.size === 0) {
          state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.map((c) => c.name));
        }
        if (state.quizStationLines.size === 0) {
          state.quizStationLines = new Set(
            TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("mrt_tpe_") || l.id === "mrt_ntpc_y" || l.id.startsWith("tra_")).map((l) => l.id)
          );
        }
      }
      syncQuizModeTabsUI();
      renderScopeModalGrid();
    });
  });

  // Setup / Scope Modal
  const openScopeFn = () => {
    if (state.selectedCounties.size > 0 && state.quizStationLines.size > 0) {
      state.quizTargetMode = "mixed";
    } else if (state.selectedCounties.size === 0 && state.quizStationLines.size > 0) {
      state.quizTargetMode = "station";
    } else {
      state.quizTargetMode = "region";
    }
    syncQuizModeTabsUI();
    renderScopeModalGrid();
    document.getElementById("modal-scope").classList.remove("hidden");
  };
  document.getElementById("btn-open-scope").addEventListener("click", openScopeFn);
  document.getElementById("btn-open-scope-inline").addEventListener("click", openScopeFn);
  document.getElementById("btn-close-scope").addEventListener("click", () => {
    document.getElementById("modal-scope").classList.add("hidden");
  });

  document.getElementById("btn-scope-all").addEventListener("click", () => {
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.map((c) => c.name));
    renderScopeModalGrid();
  });
  document.getElementById("btn-scope-six").addEventListener("click", () => {
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.isSpecial).map((c) => c.name));
    renderScopeModalGrid();
  });
  document.getElementById("btn-scope-north").addEventListener("click", () => {
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.region === "north").map((c) => c.name));
    renderScopeModalGrid();
  });
  document.getElementById("btn-scope-central").addEventListener("click", () => {
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.region === "central").map((c) => c.name));
    renderScopeModalGrid();
  });
  document.getElementById("btn-scope-south").addEventListener("click", () => {
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.region === "south").map((c) => c.name));
    renderScopeModalGrid();
  });
  document.getElementById("btn-scope-east").addEventListener("click", () => {
    state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.filter((c) => c.region === "east").map((c) => c.name));
    renderScopeModalGrid();
  });
  document.getElementById("btn-scope-islands").addEventListener("click", () => {
    state.selectedCounties = new Set(["澎湖縣", "金門縣", "連江縣"]);
    renderScopeModalGrid();
  });
  document.getElementById("btn-scope-random-one").addEventListener("click", () => {
    const pick = TAIWAN_ADMIN_DATA[Math.floor(Math.random() * TAIWAN_ADMIN_DATA.length)];
    state.selectedCounties = new Set([pick.name]);
    renderScopeModalGrid();
  });
  document.getElementById("btn-scope-clear").addEventListener("click", () => {
    state.selectedCounties.clear();
    renderScopeModalGrid();
  });

  // Station Quiz Quick Presets inside #modal-scope
  const setQuizLines = (predicate) => {
    state.quizStationLines = new Set(
      TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway && predicate(l)).map((l) => l.id)
    );
    renderScopeModalGrid();
  };
  document.getElementById("btn-qst-none").addEventListener("click", () => {
    state.quizStationLines.clear();
    renderScopeModalGrid();
  });
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

  const chkRawRail = document.getElementById("chk-raw-rail-tile");
  if (chkRawRail) {
    chkRawRail.addEventListener("change", (e) => {
      state.showRawOpenRailwayTile = e.target.checked;
      updateRoadAndRailwayTileOverlays();
    });
  }

  document.getElementById("btn-apply-scope").addEventListener("click", () => {
    // Must have at least 1 county OR at least 1 station line
    if (state.selectedCounties.size === 0 && state.quizStationLines.size === 0) {
      setFeedback("⚠️ 請至少選擇 1 個縣市或 1 條車站路線作為挑戰題庫！", "warn");
      state.selectedCounties = new Set(["臺北市"]);
    }

    if (state.quizStationLines.size > 0) {
      state.stationQuizEnabled = true;
      // Sync selected station lines into map transport overlay so routes & station dots are shown immediately
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

    // If Pure Station Mode or specific station lines selected, auto-fit map bounds to active stations
    if (state.selectedCounties.size === 0 && activeSt.length > 0 && map) {
      const bounds = L.latLngBounds(activeSt.map((s) => [s.lat, s.lng]));
      if (bounds.isValid()) {
        map.flyToBounds(bounds.pad(0.18), { duration: 0.6, maxZoom: 13 });
      }
      setFeedback(`🚉 已開啟純猜車站挑戰（共 ${state.quizStationLines.size} 條路線、${activeSt.length} 座車站），直接輸入站名即可解鎖！`, "tier");
    }

    if (state.isHost && (state.opponent.connected || state.roomCode)) {
      onHostSettingChange("題庫範圍");
    }
  });

  // P2P Modal & Lobby Controls
  document.getElementById("btn-open-p2p").addEventListener("click", () => {
    updateP2PLobbyUI();
    document.getElementById("modal-p2p").classList.remove("hidden");
    if (window.lucide && typeof window.lucide.createIcons === "function") lucide.createIcons();
  });
  document.getElementById("btn-close-p2p").addEventListener("click", () => {
    document.getElementById("modal-p2p").classList.add("hidden");
  });
  document.getElementById("btn-p2p-host").addEventListener("click", () => hostP2PRoom());
  document.getElementById("btn-p2p-join").addEventListener("click", () => joinP2PRoom());

  // Copy P2P Share URL with visual feedback
  const btnCopyUrl = document.getElementById("btn-copy-p2p-url");
  if (btnCopyUrl) {
    btnCopyUrl.addEventListener("click", () => {
      const input = document.getElementById("p2p-share-url");
      if (!input || !input.value || input.value === "尚未建立房間") return;
      input.select();
      try {
        navigator.clipboard.writeText(input.value).then(() => {
          btnCopyUrl.innerHTML = `<span>✓ 已複製!</span>`;
          setTimeout(() => {
            btnCopyUrl.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5"></i><span>複製</span>`;
            if (window.lucide) lucide.createIcons();
          }, 1500);
        });
      } catch (e) {
        document.execCommand("copy");
        btnCopyUrl.innerHTML = `<span>✓ 已複製!</span>`;
        setTimeout(() => {
          btnCopyUrl.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5"></i><span>複製</span>`;
          if (window.lucide) lucide.createIcons();
        }, 1500);
      }
      document.getElementById("p2p-modal-status").textContent = "已複製對戰邀請連結！發送給好友即可直接加入";
    });
  }

  document.getElementById("btn-p2p-toggle-ready").addEventListener("click", () => {
    toggleP2PReady();
  });

  document.getElementById("p2p-nickname-input").addEventListener("input", (e) => {
    state.nickname = e.target.value.trim() || "玩家";
    updateP2PLobbyUI();
    if (state.opponent.connected) {
      sendP2PMessage("SYNC_READY_STATUS", { ready: state.isReady, name: state.nickname });
    }
  });

  // P2P Host Right Panel: Quiz Mode Switcher
  document.querySelectorAll(".p2p-qmode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.isHost) return;
      const qm = btn.getAttribute("data-p2pqmode");
      state.quizTargetMode = qm;
      if (qm === "region") {
        state.quizStationLines.clear();
        state.stationQuizEnabled = false;
        if (state.selectedCounties.size === 0) {
          state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.map((c) => c.name));
        }
      } else if (qm === "station") {
        state.selectedCounties.clear();
        state.stationQuizEnabled = true;
        if (state.quizStationLines.size === 0) {
          state.quizStationLines = new Set(
            TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("mrt_tpe_") || l.id === "mrt_ntpc_y").map((l) => l.id)
          );
        }
      } else if (qm === "mixed") {
        state.stationQuizEnabled = true;
        if (state.selectedCounties.size === 0) {
          state.selectedCounties = new Set(TAIWAN_ADMIN_DATA.map((c) => c.name));
        }
        if (state.quizStationLines.size === 0) {
          state.quizStationLines = new Set(
            TAIWAN_SELECTABLE_LINES.filter((l) => l.id.startsWith("mrt_tpe_") || l.id === "mrt_ntpc_y" || l.id.startsWith("tra_")).map((l) => l.id)
          );
        }
      }
      renderP2PHostSettingsUI();
      renderScopeModalGrid();
      onHostSettingChange("挑戰主模式");
    });
  });

  // P2P Host Right Panel: Difficulty Buttons
  document.querySelectorAll(".p2p-diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.isHost) return;
      setDifficulty(btn.getAttribute("data-p2pdiff"));
      renderP2PHostSettingsUI();
      onHostSettingChange("挑戰難度");
    });
  });

  // P2P Host Right Panel: Play Mode Buttons
  document.querySelectorAll(".p2p-playmode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.isHost) return;
      setPlayMode(btn.getAttribute("data-p2pplaymode"));
      renderP2PHostSettingsUI();
      onHostSettingChange("出題方式");
    });
  });

  // P2P Host Right Panel: Admin Scope Presets
  const bindP2PScopePreset = (btnId, countyFilter) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (!state.isHost) return;
      state.selectedCounties = new Set(countyFilter ? TAIWAN_ADMIN_DATA.filter(countyFilter).map((c) => c.name) : []);
      renderP2PHostSettingsUI();
      renderScopeModalGrid();
      onHostSettingChange("行政區範圍");
    });
  };
  bindP2PScopePreset("btn-p2p-scope-all", () => true);
  bindP2PScopePreset("btn-p2p-scope-six", (c) => c.isSpecial);
  bindP2PScopePreset("btn-p2p-scope-north", (c) => c.region === "north");
  bindP2PScopePreset("btn-p2p-scope-central", (c) => c.region === "central");
  bindP2PScopePreset("btn-p2p-scope-south", (c) => c.region === "south");
  bindP2PScopePreset("btn-p2p-scope-east", (c) => c.region === "east");
  bindP2PScopePreset("btn-p2p-scope-islands", (c) => c.region === "island" || ["澎湖縣", "金門縣", "連江縣"].includes(c.name));
  bindP2PScopePreset("btn-p2p-scope-clear", null);

  // P2P Host Right Panel: Railway Lines Presets
  const bindP2PStationPreset = (btnId, lineFilter) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (!state.isHost) return;
      state.quizStationLines = new Set(
        lineFilter ? TAIWAN_SELECTABLE_LINES.filter((l) => !l.isHighway && lineFilter(l)).map((l) => l.id) : []
      );
      state.stationQuizEnabled = state.quizStationLines.size > 0;
      renderP2PHostSettingsUI();
      renderScopeModalGrid();
      onHostSettingChange("車站題庫");
    });
  };
  bindP2PStationPreset("btn-p2p-qst-none", null);
  bindP2PStationPreset("btn-p2p-qst-tpemrt", (l) => l.id.startsWith("mrt_tpe_") || l.id === "mrt_ntpc_y");
  bindP2PStationPreset("btn-p2p-qst-allmrt", (l) => l.id.startsWith("mrt_"));
  bindP2PStationPreset("btn-p2p-qst-lrt", (l) => l.id.startsWith("lrt_"));
  bindP2PStationPreset("btn-p2p-qst-tra-all", (l) => l.id.startsWith("tra_"));
  bindP2PStationPreset("btn-p2p-qst-tra-branch", (l) => ["tra_pingxi", "tra_neiwan", "tra_jiji", "tra_shalun"].includes(l.id));
  bindP2PStationPreset("btn-p2p-qst-thsr", (l) => l.id === "thsr");
  bindP2PStationPreset("btn-p2p-qst-heritage", (l) => ["alishan", "sugar_train", "cable_maokong"].includes(l.id));
  bindP2PStationPreset("btn-p2p-qst-all", () => true);

  // P2P Terminus Hints Toggle
  document.getElementById("chk-p2p-terminus-hints")?.addEventListener("change", (e) => {
    if (!state.isHost) return;
    state.showStationTerminusHints = e.target.checked;
    const chkScope = document.getElementById("chk-station-terminus-hints");
    if (chkScope) chkScope.checked = e.target.checked;
    renderP2PHostSettingsUI();
    renderScopeModalGrid();
    onHostSettingChange("端點站提示");
  });

  // Fair Rules Change Listeners (由房主調整，對手即時可見)
  document.getElementById("p2p-layer-rule-select")?.addEventListener("change", () => {
    if (!state.isHost) return;
    const lrule = document.getElementById("p2p-layer-rule-select").value;
    const flayer = document.getElementById("p2p-forced-layer-select").value;
    const rrule = document.getElementById("p2p-rail-rule-select").value;
    applyP2PLayerRule(lrule, flayer, rrule);
    onHostSettingChange("底圖限制");
  });
  document.getElementById("p2p-forced-layer-select")?.addEventListener("change", () => {
    if (!state.isHost) return;
    const lrule = document.getElementById("p2p-layer-rule-select").value;
    const flayer = document.getElementById("p2p-forced-layer-select").value;
    const rrule = document.getElementById("p2p-rail-rule-select").value;
    applyP2PLayerRule(lrule, flayer, rrule);
    onHostSettingChange("指定底圖");
  });
  document.getElementById("p2p-rail-rule-select")?.addEventListener("change", () => {
    if (!state.isHost) return;
    const lrule = document.getElementById("p2p-layer-rule-select").value;
    const flayer = document.getElementById("p2p-forced-layer-select").value;
    const rrule = document.getElementById("p2p-rail-rule-select").value;
    applyP2PLayerRule(lrule, flayer, rrule);
    onHostSettingChange("路網規則");
  });

  // Host Start Battle
  document.getElementById("btn-p2p-sync-start").addEventListener("click", () => {
    if (!state.isHost) return;
    if (!state.opponent.connected) {
      setFeedback("⚠️ 請等待對手加入房間！", "warn");
      return;
    }
    if (!state.opponent.isReady) {
      setFeedback("⚠️ 請等待對手確認最新設定並點擊「準備」，再開始對戰！", "warn");
      return;
    }
    const lrule = document.getElementById("p2p-layer-rule-select")?.value || "free";
    const flayer = document.getElementById("p2p-forced-layer-select")?.value || "vector";
    const rrule = document.getElementById("p2p-rail-rule-select")?.value || "free";
    const payload = {
      quizTargetMode: state.quizTargetMode || "region",
      difficulty: state.difficulty,
      playMode: state.playMode,
      layerRule: lrule,
      forcedLayer: flayer,
      railRule: rrule,
      selectedCounties: Array.from(state.selectedCounties),
      quizStationLines: Array.from(state.quizStationLines),
      selectedLines: Array.from(state.selectedTransportLines),
      showStationTerminusHints: Boolean(state.showStationTerminusHints)
    };
    startSynchronizedP2PCountdown(payload, true);
  });
  document.getElementById("btn-quick-sim-rival").addEventListener("click", () => toggleAiRivalSimulation());

  // Settlement & Report Card Modal Events
  document.getElementById("btn-download-settlement")?.addEventListener("click", () => downloadSettlementCard());
  document.getElementById("btn-share-settlement")?.addEventListener("click", () => shareSettlementCard());
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
    setFeedback("⚔️ 對手已提早結束，你可繼續作答衝刺高分，或隨時點擊【結束並看答案】結算勝負！", "info");
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
    document.getElementById("modal-timer").classList.remove("hidden");
  });
  document.getElementById("btn-close-timer").addEventListener("click", () => {
    document.getElementById("modal-timer").classList.add("hidden");
  });
  document.querySelectorAll(".timer-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-timermode");
      const sec = parseInt(btn.getAttribute("data-sec"), 10) || 300;
      state.timerMode = mode;
      state.countdownTotalSec = sec;
      document.getElementById("btn-timer-mode").textContent =
        mode === "up" ? "正計時" : `倒數 ${Math.round(sec / 60)}m`;
      document.getElementById("modal-timer").classList.add("hidden");
      resetGame();
    });
  });
  document.getElementById("btn-apply-custom-timer").addEventListener("click", () => {
    const mins = Math.max(1, parseInt(document.getElementById("custom-countdown-min").value, 10) || 5);
    state.timerMode = "down";
    state.countdownTotalSec = mins * 60;
    document.getElementById("btn-timer-mode").textContent = `倒數 ${mins}m`;
    document.getElementById("modal-timer").classList.add("hidden");
    resetGame();
  });

  // Audio & Info Modals
  document.getElementById("btn-audio-toggle").addEventListener("click", (e) => {
    state.soundEnabled = !state.soundEnabled;
    e.currentTarget.innerHTML = `<i data-lucide="${state.soundEnabled ? "volume-2" : "volume-x"}" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>`;
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

window.addEventListener("load", () => {
  if (window.lucide) lucide.createIcons();
  bindAllUIEvents();
  initMap();
  updatePrefixDropdownUI();
  updateScoreAndProgressUI();
  updateP2PPanelVisibility();
  initP2PEngine();
  initPrecisionRailAndStationEngine();
});
