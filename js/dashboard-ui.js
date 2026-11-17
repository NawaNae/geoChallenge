// ============================================================================
// 8. SPOILER-FREE PROGRESS DASHBOARD & QUICK COUNTY ZOOM CHIPS
// ============================================================================
function updateScoreAndProgressUI() {
  const scopeCounties = getScopeCounties();
  const scopeTowns = getScopeTowns();
  const hasRegionScope = scopeTowns.length > 0 || (state.difficulty === "county_only" && scopeCounties.length > 0);

  const unlockedCountyCount = scopeCounties.filter((c) => {
    if (state.difficulty === "county_only" || state.difficulty === "master_hierarchy") {
      return state.unlockedCounties.has(c.name);
    }
    const uTowns = ALL_TOWNS.filter((t) => t.countyName === c.name && state.unlockedTowns.has(t.id)).length;
    return state.unlockedCounties.has(c.name) || uTowns > 0;
  }).length;

  const countyPct =
    scopeCounties.length > 0
      ? ((unlockedCountyCount / scopeCounties.length) * 100).toFixed(1)
      : "0.0";

  const unlockedTownCount = scopeTowns.filter((t) => state.unlockedTowns.has(t.id)).length;
  const townPct =
    scopeTowns.length > 0
      ? ((unlockedTownCount / scopeTowns.length) * 100).toFixed(1)
      : "0.0";

  const activeSt = getActiveQuizStations();
  const unlockedStCount = activeSt.filter((s) => state.unlockedStations.has(s.key)).length;
  const stPct =
    activeSt.length > 0
      ? ((unlockedStCount / activeSt.length) * 100).toFixed(1)
      : "0.0";

  const regionCurrent = state.difficulty === "county_only" ? unlockedCountyCount : unlockedTownCount;
  const regionTotal = state.difficulty === "county_only" ? scopeCounties.length : scopeTowns.length;
  const regionPct = state.difficulty === "county_only" ? countyPct : townPct;

  const grandCurrent = regionCurrent + unlockedStCount;
  const grandTotal = regionTotal + activeSt.length;
  const grandPct = grandTotal > 0 ? ((grandCurrent / grandTotal) * 100).toFixed(1) : "0.0";

  // Update Top Dual Cards (Card 1: 地區進度 or 總進度; Card 2: 車站進度 or 鄉鎮進度)
  const cLabelEl = document.getElementById("stat-county-label");
  if (regionTotal > 0 && activeSt.length > 0) {
    if (cLabelEl) cLabelEl.textContent = "🗺️ 地區完成度";
    document.getElementById("stat-county-count").textContent = `${regionCurrent} / ${regionTotal} ${state.difficulty === "county_only" ? "縣市" : "區"}`;
    document.getElementById("stat-county-pct").textContent = `${regionPct}%`;
    document.getElementById("stat-county-bar").style.width = `${Math.min(100, parseFloat(regionPct))}%`;

    document.getElementById("stat-town-label").textContent = "🚉 車站完成度";
    document.getElementById("stat-town-count").textContent = `${unlockedStCount} / ${activeSt.length} 站`;
    document.getElementById("stat-town-pct").textContent = `${stPct}%`;
    document.getElementById("stat-town-bar").style.width = `${Math.min(100, parseFloat(stPct))}%`;
  } else if (regionTotal === 0 && activeSt.length > 0) {
    // Pure Station Mode
    const activeLineCount = state.stationQuizEnabled && state.quizStationLines.size > 0
      ? state.quizStationLines.size
      : Array.from(state.selectedTransportLines).filter((id) => !id.startsWith("hw_")).length;
    if (cLabelEl) cLabelEl.textContent = "🗺️ 已選路線數";
    document.getElementById("stat-county-count").textContent = `${activeLineCount} 條路線`;
    document.getElementById("stat-county-pct").textContent = `${stPct}%`;
    document.getElementById("stat-county-bar").style.width = `${Math.min(100, parseFloat(stPct))}%`;

    document.getElementById("stat-town-label").textContent = "🚉 車站總進度";
    document.getElementById("stat-town-count").textContent = `${unlockedStCount} / ${activeSt.length} 站`;
    document.getElementById("stat-town-pct").textContent = `${stPct}%`;
    document.getElementById("stat-town-bar").style.width = `${Math.min(100, parseFloat(stPct))}%`;
  } else {
    // Pure Region Mode
    if (cLabelEl) cLabelEl.textContent = "縣市級直轄市進度";
    document.getElementById("stat-county-count").textContent = `${unlockedCountyCount} / ${scopeCounties.length} 縣市`;
    document.getElementById("stat-county-pct").textContent = `${countyPct}%`;
    document.getElementById("stat-county-bar").style.width = `${Math.min(100, parseFloat(countyPct))}%`;

    document.getElementById("stat-town-label").textContent = state.difficulty === "county_only" ? "對應鄉鎮範圍" : "鄉鎮市區進度";
    document.getElementById("stat-town-count").textContent = state.difficulty === "county_only" ? `縣市模式 (${scopeCounties.length}縣市)` : `${unlockedTownCount} / ${scopeTowns.length} 區`;
    document.getElementById("stat-town-pct").textContent = `${regionPct}%`;
    document.getElementById("stat-town-bar").style.width = `${Math.min(100, parseFloat(regionPct))}%`;
  }

  // Top Header Main Metric
  if (regionTotal === 0 && activeSt.length > 0) {
    document.getElementById("top-metric-label").textContent = "車站完成度";
    document.getElementById("top-score-display").textContent = `${unlockedStCount} / ${activeSt.length} 站`;
    document.getElementById("top-percent-display").textContent = `${stPct}%`;
  } else if (regionTotal > 0 && activeSt.length > 0) {
    document.getElementById("top-metric-label").textContent = "總進度 (地區+站)";
    document.getElementById("top-score-display").textContent = `區${regionCurrent}/${regionTotal} (${regionPct}%) · 站${unlockedStCount}/${activeSt.length} (${stPct}%)`;
    document.getElementById("top-percent-display").textContent = `總 ${grandPct}%`;
  } else {
    document.getElementById("top-metric-label").textContent = state.difficulty === "county_only" ? "縣市完成度" : "鄉鎮完成度";
    document.getElementById("top-score-display").textContent = `${regionCurrent} / ${regionTotal}`;
    document.getElementById("top-percent-display").textContent = `${regionPct}%`;
  }

  document.getElementById("local-p2p-score").textContent = `${grandCurrent} / ${grandTotal}`;
  document.getElementById("local-p2p-pct").textContent = `${grandPct}%`;
  document.getElementById("local-p2p-bar").style.width = `${Math.min(100, parseFloat(grandPct))}%`;

  const topMainBar = document.getElementById("top-main-progress-bar");
  if (topMainBar) {
    topMainBar.style.width = `${Math.min(100, parseFloat(grandPct))}%`;
  }

  // Render Dynamic Multi-Category Progress Bars (總進度 / 地區 / 台鐵 / 高鐵 / 捷運 / 輕軌 / 纜車 / 林鐵 / 糖鐵 - 有開才顯示!)
  const multiBarsEl = document.getElementById("multi-category-progress-bars");
  if (multiBarsEl) {
    const bars = [];
    // 1. 總進度
    bars.push({
      label: "🏆 總進度",
      cur: grandCurrent,
      tot: grandTotal,
      unit: "項",
      color: "linear-gradient(90deg, #38bdf8, #10b981)"
    });
    // 2. 地區 (有開才顯示)
    if (regionTotal > 0) {
      bars.push({
        label: "🗺️ 地區 (行政區)",
        cur: regionCurrent,
        tot: regionTotal,
        unit: state.difficulty === "county_only" ? "縣市" : "區",
        color: "#38bdf8"
      });
    }
    // 3. 軌道各系統 (台鐵 / 高鐵 / 捷運 / 輕軌 / 纜車 / 林鐵 / 糖鐵 - 有開才顯示!)
    const macroOrder = [
      { key: "台鐵", label: "🚆 台鐵", color: "#0ea5e9" },
      { key: "高鐵", label: "🚄 高鐵", color: "#fb923c" },
      { key: "捷運", label: "🚇 捷運", color: "#f43f5e" },
      { key: "輕軌", label: "🚋 輕軌", color: "#2dd4bf" },
      { key: "纜車", label: "🚡 纜車", color: "#a855f7" },
      { key: "林鐵", label: "🌲 林鐵", color: "#10b981" },
      { key: "糖鐵", label: "🍬 糖鐵", color: "#f59e0b" }
    ];
    macroOrder.forEach((m) => {
      const mStations = activeSt.filter((s) => s.macro === m.key);
      if (mStations.length > 0) {
        const mUnlocked = mStations.filter((s) => state.unlockedStations.has(s.key)).length;
        bars.push({
          label: m.label,
          cur: mUnlocked,
          tot: mStations.length,
          unit: "站",
          color: m.color
        });
      }
    });

    multiBarsEl.innerHTML = bars
      .map((b) => {
        const pct = b.tot > 0 ? ((b.cur / b.tot) * 100).toFixed(1) : "0.0";
        return `
          <div class="space-y-0.5">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold text-slate-200">${b.label}</span>
              <span class="font-mono-num text-slate-300"><strong class="text-white">${b.cur}</strong> / ${b.tot} ${b.unit} · <span class="text-sky-300 font-bold">${pct}%</span></span>
            </div>
            <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full transition-all duration-300" style="width:${Math.min(100, parseFloat(pct))}%; background:${b.color}"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  renderQuickZoomCountyChips();
  renderCountyProgressSidebar();
}

function selectAndZoomToCounty(c, autoCloseJumpMenu = false) {
  zoomToCountyCenter(c.name);
  if (state.difficulty !== "county_only") {
    const prefixSelect = document.getElementById("prefix-select");
    const targetVal =
      state.difficulty === "master_hierarchy"
        ? c.isSpecial ? c.name : `${c.province}${c.name}`
        : c.name;
    if (prefixSelect) {
      prefixSelect.value = targetVal;
      updateLiveCombinedPreview();
    }
  }
  if (autoCloseJumpMenu) {
    const jList = document.getElementById("quick-jump-list");
    if (jList) {
      jList.classList.add("hidden");
      jList.classList.remove("flex");
    }
  }
  setFeedback(`📍 已快速放大至「${c.name}」中心！`, "info");
}

function renderQuickZoomCountyChips() {
  const bar = document.getElementById("quick-zoom-counties-bar");
  const mapJumpBar = document.getElementById("map-jump-counties-bar");
  if (bar) bar.innerHTML = "";
  if (mapJumpBar) mapJumpBar.innerHTML = "";

  const visibleCounties = getScopeCounties().filter((c) => isCountyRevealed(c.name));

  if (visibleCounties.length === 0) {
    const emptyMsg = `<span class="col-span-3 text-[10px] text-slate-500 italic px-1">目前為純車站模式或尚未解鎖縣市</span>`;
    if (bar) bar.innerHTML = `<span class="text-[11px] text-slate-500 italic">目前為純車站模式或尚未解鎖縣市 (可點下方各路線卡片快速放大至該路線！)</span>`;
    if (mapJumpBar) mapJumpBar.innerHTML = emptyMsg;
    return;
  }

  visibleCounties.forEach((c) => {
    const color = COUNTY_COLORS[c.name] || "#38bdf8";

    if (bar) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-700 transition flex items-center gap-1";
      btn.innerHTML = `<span class="w-2 h-2 rounded-full" style="background:${color}"></span><span>${c.name}</span>`;
      btn.title = `點擊快速放大至「${c.name}」中心並套用前綴`;
      btn.addEventListener("click", () => selectAndZoomToCounty(c, false));
      bar.appendChild(btn);
    }

    if (mapJumpBar) {
      const jBtn = document.createElement("button");
      jBtn.type = "button";
      jBtn.className =
        "px-1.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-slate-800 transition flex items-center gap-1 truncate";
      jBtn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:${color}"></span><span class="truncate">${c.name}</span>`;
      jBtn.title = `跳轉至「${c.name}」並套用前綴`;
      jBtn.addEventListener("click", () => selectAndZoomToCounty(c, true));
      mapJumpBar.appendChild(jBtn);
    }
  });
}

function renderCountyProgressSidebar() {
  const container = document.getElementById("county-progress-list");
  const spoilerBadge = document.getElementById("hidden-counties-badge");
  const titleEl = document.getElementById("breakdown-list-title");
  if (!container) return;
  container.innerHTML = "";

  const activeSt = getActiveQuizStations();
  const scopeCounties = getScopeCounties();

  if (titleEl) {
    if (scopeCounties.length > 0 && activeSt.length > 0) {
      titleEl.textContent = "車站路線與各縣市完成度明細";
    } else if (activeSt.length > 0) {
      titleEl.textContent = "各系統總計與車站路線完成度明細";
    } else {
      titleEl.textContent = "各縣市完成度明細";
    }
  }

  // PART A: IF STATIONS ARE ENABLED, RENDER SYSTEM TOTALS (e.g. 台北捷運 總計, 台鐵 總計) + INDIVIDUAL LINES (e.g. 台鐵.縱貫線北段, 台北捷運.紅線)
  if (activeSt.length > 0) {
    const activeLinesSet = state.stationQuizEnabled && state.quizStationLines.size > 0
      ? state.quizStationLines
      : state.selectedTransportLines;

    // 1. System Totals (台北捷運 總計 / 台鐵 總計 / 高鐵 總計 / 輕軌 總計 ...)
    const sysGroups = new Map();
    activeSt.forEach((st) => {
      const sName = st.sysTotal || "軌道系統";
      if (!sysGroups.has(sName)) sysGroups.set(sName, []);
      sysGroups.get(sName).push(st);
    });

    if (sysGroups.size > 0) {
      const sysHeader = document.createElement("div");
      sysHeader.className = "text-[11px] font-extrabold text-pink-300 uppercase tracking-wider px-1 pt-0.5";
      sysHeader.textContent = "📊 軌道系統總百分比 (點擊放大該系統範圍)";
      container.appendChild(sysHeader);

      sysGroups.forEach((stArr, sysName) => {
        const totalS = stArr.length;
        const unlockedS = stArr.filter((s) => state.unlockedStations.has(s.key)).length;
        const pctS = totalS > 0 ? ((unlockedS / totalS) * 100).toFixed(1) : "0.0";
        const isDone = unlockedS === totalS && totalS > 0;
        const barColor = (stArr[0] && stArr[0].color) || "#ec4899";

        const sCard = document.createElement("div");
        sCard.className = "p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-pink-500/30 cursor-pointer transition flex flex-col gap-1";
        sCard.innerHTML = `
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5 font-extrabold text-white">
              <span class="w-2.5 h-2.5 rounded-full" style="background:${barColor}"></span>
              <span>${sysName} 總計</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-pink-500/15 text-pink-300">📍點擊放大</span>
            </div>
            <div class="font-mono-num text-xs ${isDone ? "text-emerald-400 font-bold" : "text-pink-200 font-semibold"}">
              ${unlockedS} / ${totalS} 站 · ${pctS}%
            </div>
          </div>
          <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full" style="width:${Math.min(100, parseFloat(pctS))}%; background:${barColor}"></div>
          </div>
        `;
        sCard.addEventListener("click", () => {
          if (!map || stArr.length === 0) return;
          const b = L.latLngBounds(stArr.map((x) => [x.lat, x.lng]));
          if (b.isValid()) map.flyToBounds(b.pad(0.18), { duration: 0.55, maxZoom: 13 });
          setFeedback(`📍 已放大至「${sysName}」全線範圍 (已完成 ${unlockedS}/${totalS} 站 · ${pctS}%)`, "info");
        });
        container.appendChild(sCard);
      });
    }

    // 2. Individual Line Breakdown (台鐵.縱貫線北段 / 台北捷運.紅線 ...)
    const lineHeader = document.createElement("div");
    lineHeader.className = "text-[11px] font-extrabold text-amber-300 uppercase tracking-wider px-1 pt-2";
    lineHeader.textContent = "🛤️ 各路線車站完成度 (系統.路線)";
    container.appendChild(lineHeader);

    TAIWAN_SELECTABLE_LINES.forEach((line) => {
      if (line.isHighway || !activeLinesSet.has(line.id)) return;
      const meta = LINE_DISPLAY_META[line.id] || { dotName: line.name };
      const lineStations = activeSt.filter((s) => s.lineIds && s.lineIds.includes(line.id));
      if (lineStations.length === 0) return;

      const totalL = lineStations.length;
      const unlockedL = lineStations.filter((s) => state.unlockedStations.has(s.key)).length;
      const pctL = totalL > 0 ? ((unlockedL / totalL) * 100).toFixed(1) : "0.0";
      const isLineDone = unlockedL === totalL && totalL > 0;
      const lineTitle = typeof getLineDisplayName === "function" ? getLineDisplayName(meta.dotName || line.name) : (meta.dotName || line.name);

      const lRow = document.createElement("div");
      lRow.className = "p-2.5 rounded-xl bg-slate-900/75 hover:bg-slate-800/85 border border-slate-800 cursor-pointer transition flex flex-col gap-1";
      lRow.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 font-bold text-slate-100 truncate">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${line.color}"></span>
            <span class="truncate">${lineTitle}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 shrink-0">📍放大路線</span>
          </div>
          <div class="font-mono-num text-xs shrink-0 ${isLineDone ? "text-emerald-400 font-bold" : "text-slate-300"}">
            ${unlockedL} / ${totalL} 站 · ${pctL}%
          </div>
        </div>
        <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full" style="width:${Math.min(100, parseFloat(pctL))}%; background:${line.color}"></div>
        </div>
      `;
      lRow.addEventListener("click", () => {
        if (!map || lineStations.length === 0) return;
        const b = L.latLngBounds(lineStations.map((x) => [x.lat, x.lng]));
        if (b.isValid()) map.flyToBounds(b.pad(0.2), { duration: 0.55, maxZoom: 13 });
        setFeedback(`📍 已放大至「${lineTitle}」(已完成 ${unlockedL}/${totalL} 站 · ${pctL}%)`, "info");
      });
      container.appendChild(lRow);
    });
  }

  // PART B: IF REGIONS ARE ENABLED, RENDER COUNTY PROGRESS LIST
  let hiddenCount = 0;
  if (scopeCounties.length > 0 && activeSt.length > 0) {
    const regHeader = document.createElement("div");
    regHeader.className = "text-[11px] font-extrabold text-sky-300 uppercase tracking-wider px-1 pt-2";
    regHeader.textContent = "🗺️ 各縣市行政區完成度";
    container.appendChild(regHeader);
  }

  scopeCounties.forEach((c) => {
    const revealed = isCountyRevealed(c.name);
    if (!revealed) {
      hiddenCount++;
      return;
    }

    const totalInCounty = c.towns.length;
    const unlockedInCounty = ALL_TOWNS.filter(
      (t) => t.countyName === c.name && state.unlockedTowns.has(t.id)
    ).length;
    const isCountyDone =
      state.difficulty === "county_only"
        ? state.unlockedCounties.has(c.name)
        : unlockedInCounty === totalInCounty;
    const pct =
      state.difficulty === "county_only"
        ? isCountyDone ? 100 : 0
        : Math.round((unlockedInCounty / totalInCounty) * 100);

    const row = document.createElement("div");
    row.className =
      "p-2.5 rounded-xl bg-slate-900/75 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition flex flex-col gap-1";

    const color = COUNTY_COLORS[c.name] || "#38bdf8";

    row.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 font-bold text-slate-100">
          <span class="w-2.5 h-2.5 rounded-full" style="background:${color}"></span>
          <span>${c.name}</span>
          <span class="text-[10px] text-slate-400 font-normal">(${c.province})</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300">📍點擊放大</span>
        </div>
        <div class="font-mono-num text-xs ${isCountyDone ? "text-emerald-400 font-bold" : "text-slate-300"}">
          ${state.difficulty === "county_only" ? (isCountyDone ? "✓ 已解鎖 · 100%" : "0%") : `${unlockedInCounty} / ${totalInCounty} · ${pct}%`}
        </div>
      </div>
      <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div class="h-full" style="width:${pct}%; background:${color}"></div>
      </div>
    `;

    row.addEventListener("click", () => {
      zoomToCountyCenter(c.name);
      if (state.difficulty !== "county_only") {
        const prefixSelect = document.getElementById("prefix-select");
        const targetVal =
          state.difficulty === "master_hierarchy"
            ? c.isSpecial ? c.name : `${c.province}${c.name}`
            : c.name;
        if (prefixSelect) {
          prefixSelect.value = targetVal;
          updateLiveCombinedPreview();
          setFeedback(`📍 已放大至「${c.name}」中心並套用前綴`, "info");
        }
      }
    });

    container.appendChild(row);
  });

  if (hiddenCount > 0) {
    spoilerBadge.classList.remove("hidden");
    const lockedCard = document.createElement("div");
    lockedCard.className = "p-3.5 rounded-2xl bg-slate-900/50 border border-dashed border-slate-700 text-center space-y-1";
    lockedCard.innerHTML = `
      <div class="text-xs font-bold text-amber-300">🔒 尚有 ${hiddenCount} 個未解鎖縣市已隱藏名稱 (防止劇透)</div>
      <p class="text-[11px] text-slate-400">
        在「${state.difficulty === "county_only" ? "縣市挑戰" : state.difficulty === "master_hierarchy" ? "最難三階解鎖" : "困難全名"}」模式下，未解鎖的縣市不會提前顯示於列表；當你猜出該縣市後，即會自動顯示進度並開放點擊放大定位！
      </p>
    `;
    container.appendChild(lockedCard);
  } else {
    spoilerBadge.classList.add("hidden");
  }
}

function checkVictoryCondition() {
  if (state.isGameOver || state.finished || state.role === "spectator") return;
  const activeSt = getActiveQuizStations();
  const unlockedStCount = activeSt.filter((s) => state.unlockedStations.has(s.key)).length;
  const adminTotal =
    state.difficulty === "county_only"
      ? getScopeCounties().length
      : getScopeTowns().length;
  const adminCurrent =
    state.difficulty === "county_only"
      ? Array.from(state.unlockedCounties).filter((c) => state.selectedCounties.has(c)).length
      : Array.from(state.unlockedTowns).filter((id) => {
          const t = ALL_TOWNS.find((x) => x.id === id);
          return t && state.selectedCounties.has(t.countyName);
        }).length;

  const total = adminTotal + activeSt.length;
  const current = adminCurrent + unlockedStCount;

  if (total > 0 && current >= total) {
    finishGame("victory");
  }
}

function giveUpAndReveal() {
  finishGame("giveup");
}

function finishGame(reason = "victory") {
  if (state.role === "spectator") return;
  stopTimer();
  state.isGameOver = true;
  state.finished = true;

  if (reason !== "victory") {
    if (state.difficulty === "county_only") {
      getScopeCounties().forEach((c) => {
        if (!state.unlockedCounties.has(c.name)) {
          ALL_TOWNS.filter((t) => t.countyName === c.name).forEach((t) => state.missedTowns.add(t.id));
        }
      });
    } else {
      getScopeTowns().forEach((t) => {
        if (!state.unlockedTowns.has(t.id)) {
          state.missedTowns.add(t.id);
        }
      });
    }
  }

  updateRoadAndRailwayTileOverlays();
  refreshAllPolygonStyles();
  updateScoreAndProgressUI();

  const activeSt = getActiveQuizStations();
  const unlockedStCount = activeSt.filter((s) => state.unlockedStations.has(s.key)).length;
  const scopeCounties = getScopeCounties();
  const scopeTowns = getScopeTowns();
  const adminTotal = state.difficulty === "county_only" ? scopeCounties.length : scopeTowns.length;
  const adminCurrent = state.difficulty === "county_only"
    ? Array.from(state.unlockedCounties).filter((c) => state.selectedCounties.has(c)).length
    : Array.from(state.unlockedTowns).filter((id) => {
        const t = ALL_TOWNS.find((x) => x.id === id);
        return t && state.selectedCounties.has(t.countyName);
      }).length;

  const grandTotal = adminTotal + activeSt.length;
  const grandScore = adminCurrent + unlockedStCount;
  const totalAttempts = (state.stats && state.stats.totalAttempts) || grandScore;
  const wrongAttempts = (state.stats && state.stats.wrongAttempts) || 0;
  const correctAttempts = (state.stats && state.stats.correctAttempts) || grandScore;
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;
  const maxStreak = (state.stats && state.stats.maxStreak) || 0;

  state.finalStats = {
    name: (document.getElementById("p2p-nickname-input")?.value.trim()) || state.nickname || "玩家",
    grandScore,
    grandTotal,
    adminCurrent,
    adminTotal,
    unlockedStCount,
    stationTotal: activeSt.length,
    elapsedSec: state.elapsedSec,
    accuracy,
    wrongAttempts,
    maxStreak,
    reason,
    date: new Date().toLocaleDateString("zh-TW")
  };

  playTone(reason === "victory" ? "tier" : "unlock");

  if (state.opponent.connected || state.aiRivalTimer || state.roomCode) {
    notifyP2PPlayerFinished(state.finalStats);
  }

  showSettlementModal();

  if (reason === "victory") {
    setFeedback(`🎉 恭喜全數通關！共完成 ${grandScore} 題，耗時 ${formatTime(state.elapsedSec)}！`, "tier");
  } else if (reason === "timeout") {
    setFeedback("⏰ 時間到！已揭曉全部未完成題目並生成挑戰成績單。", "error");
  } else {
    setFeedback("已提早結束本局，揭曉未完成地名並生成挑戰成績單！", "warn");
  }
}

function getGradeFromStats(stats) {
  const pct = stats.grandTotal > 0 ? (stats.grandScore / stats.grandTotal) * 100 : 0;
  if (pct >= 100) {
    if (stats.elapsedSec <= 300) return { grade: "SSS", title: "台灣全島制霸地理神", desc: "神乎其技！全島 100% 盲猜破關" };
    if (stats.elapsedSec <= 600) return { grade: "SS", title: "環島特急神速達人", desc: "極速通關！精熟台灣全島地理" };
    return { grade: "S+", title: "台灣全島通關大師", desc: "堅毅沉穩！成功解鎖所有目標" };
  }
  if (pct >= 90) return { grade: "S", title: "卓越級·台灣地理通", desc: "近乎完美！對台灣鄉土瞭若指掌" };
  if (pct >= 75) return { grade: "A", title: "嫻熟級·在地探索專家", desc: "表現亮眼！掌握絕大多數核心地名" };
  if (pct >= 50) return { grade: "B", title: "潛力級·環島見習生", desc: "循序漸進！已經跨過全島半數門檻" };
  return { grade: "C", title: "起步級·啟程旅人", desc: "邁開步伐！踏上認識台灣的第一步" };
}

function showSettlementModal() {
  const stats = state.finalStats;
  if (!stats) return;

  const modal = document.getElementById("modal-settlement");
  if (!modal) return;

  const isMultiplayer = Boolean(state.opponent.connected || state.aiRivalTimer || state.opponent.finished);
  const oppStats = state.opponent.finalStats;

  const typeBadge = document.getElementById("settlement-type-badge");
  const modeBadge = document.getElementById("settlement-mode-badge");
  const titleEl = document.getElementById("settlement-title");
  const iconBox = document.getElementById("settlement-icon-box");
  const gradeBox = document.getElementById("settlement-grade-box");
  const vsBanner = document.getElementById("settlement-vs-banner");
  const oppOngoingBanner = document.getElementById("settlement-opp-ongoing-banner");
  const rematchBtnText = document.getElementById("rematch-btn-text");

  const diffNames = {
    casual: "休閒提示",
    county_only: "縣市挑戰",
    hard_full: "困難全名",
    master_hierarchy: "三階宗師"
  };
  const diffLabel = diffNames[state.difficulty] || state.difficulty;
  const scopeTownCount = getScopeTowns().length;
  const activeSt = getActiveQuizStations();
  const scopeSummary = state.selectedCounties.size === 22
    ? `全台 368 區${activeSt.length > 0 ? ` + ${activeSt.length}站` : ""}`
    : `${state.selectedCounties.size} 縣市 (${scopeTownCount}區)${activeSt.length > 0 ? ` + ${activeSt.length}站` : ""}`;

  if (modeBadge) modeBadge.textContent = `${diffLabel} · ${scopeSummary}`;
  if (rematchBtnText) rematchBtnText.textContent = isMultiplayer ? "發起重開對戰" : "再玩一局";

  const pctNum = stats.grandTotal > 0 ? ((stats.grandScore / stats.grandTotal) * 100) : 0;
  const pctStr = pctNum.toFixed(1) + "%";

  if (!isMultiplayer) {
    if (typeBadge) {
      typeBadge.textContent = "單人挑戰成績單";
      typeBadge.className = "text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30";
    }
    if (gradeBox) gradeBox.classList.remove("hidden");
    if (vsBanner) vsBanner.classList.add("hidden");
    if (oppOngoingBanner) oppOngoingBanner.classList.add("hidden");

    const gradeInfo = getGradeFromStats(stats);
    document.getElementById("settlement-grade").textContent = gradeInfo.grade;
    document.getElementById("settlement-grade-title").textContent = gradeInfo.title;

    if (titleEl) {
      titleEl.textContent = pctNum >= 100 ? "🎉 恭喜通關！台灣全島制霸" : "挑戰結算完成！";
    }
    if (iconBox) iconBox.innerHTML = pctNum >= 100 ? "👑" : "🏆";
  } else {
    if (typeBadge) {
      typeBadge.textContent = "⚔️ MULTIPLAYER 即時連線對戰";
      typeBadge.className = "text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    }
    if (gradeBox) gradeBox.classList.add("hidden");

    if (oppStats) {
      if (oppOngoingBanner) oppOngoingBanner.classList.add("hidden");
      if (vsBanner) vsBanner.classList.remove("hidden");

      const oppGrandScore = oppStats.grandScore || oppStats.score || 0;
      const oppGrandTotal = oppStats.grandTotal || oppStats.total || stats.grandTotal;
      const oppPctNum = oppGrandTotal > 0 ? (oppGrandScore / oppGrandTotal) * 100 : 0;
      const oppPctStr = oppPctNum.toFixed(1) + "%";

      let isWin = false;
      let isDraw = false;
      if (pctNum > oppPctNum) {
        isWin = true;
      } else if (pctNum < oppPctNum) {
        isWin = false;
      } else {
        if (stats.elapsedSec < (oppStats.elapsedSec || 999999)) {
          isWin = true;
        } else if (stats.elapsedSec > (oppStats.elapsedSec || 999999)) {
          isWin = false;
        } else {
          isDraw = true;
        }
      }

      const vsResultEl = document.getElementById("settlement-vs-result");
      const vsReasonEl = document.getElementById("settlement-vs-reason");
      const myCol = document.getElementById("settlement-my-col");
      const oppCol = document.getElementById("settlement-opp-col");
      const myCrown = document.getElementById("vs-my-crown");
      const oppCrown = document.getElementById("vs-opp-crown");

      if (isDraw) {
        if (titleEl) titleEl.textContent = "勢均力敵！雙方平手";
        if (vsResultEl) {
          vsResultEl.textContent = "⚖️ 勢均力敵 · 平手！";
          vsResultEl.className = "text-2xl sm:text-3xl font-black text-sky-400 tracking-tight";
        }
        if (vsReasonEl) vsReasonEl.textContent = `雙方完成度皆為 ${pctStr}，耗時速度不分軒輊！`;
        if (myCrown) myCrown.textContent = "⚖️ TIE";
        if (oppCrown) oppCrown.textContent = "⚖️ TIE";
        if (iconBox) iconBox.innerHTML = "⚖️";
      } else if (isWin) {
        if (titleEl) titleEl.textContent = "👑 恭喜獲得勝利！";
        if (vsResultEl) {
          vsResultEl.textContent = "👑 獲得勝利！VICTORY";
          vsResultEl.className = "text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight";
        }
        const diffScore = stats.grandScore - oppGrandScore;
        if (vsReasonEl) {
          vsReasonEl.textContent = diffScore > 0
            ? `我方完成度 ${pctStr}，以 ${diffScore} 題領先優勢奪得勝利！`
            : `雙方完成度相同 (${pctStr})，我方以更快的耗時 (${formatTime(stats.elapsedSec)}) 險勝！`;
        }
        if (myCrown) myCrown.textContent = "👑 WIN";
        if (oppCrown) oppCrown.textContent = "💔 LOSS";
        if (myCol) myCol.className = "p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/20 space-y-1";
        if (oppCol) oppCol.className = "p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-1 opacity-80";
        if (iconBox) iconBox.innerHTML = "👑";
      } else {
        if (titleEl) titleEl.textContent = "💔 惜敗！再接再厲";
        if (vsResultEl) {
          vsResultEl.textContent = "💔 遺憾惜敗 · DEFEAT";
          vsResultEl.className = "text-2xl sm:text-3xl font-black text-rose-400 tracking-tight";
        }
        const diffScore = oppGrandScore - stats.grandScore;
        if (vsReasonEl) {
          vsReasonEl.textContent = diffScore > 0
            ? `對手以 ${diffScore} 題領先優勢贏得本局，下次討回來！`
            : `雙方完成度相同，對手以更快的耗時速度獲勝！`;
        }
        if (myCrown) myCrown.textContent = "💔 LOSS";
        if (oppCrown) oppCrown.textContent = "👑 WIN";
        if (myCol) myCol.className = "p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-1 opacity-80";
        if (oppCol) oppCol.className = "p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border-2 border-indigo-500/80 shadow-lg shadow-indigo-500/20 space-y-1";
        if (iconBox) iconBox.innerHTML = "⚔️";
      }

      document.getElementById("vs-my-name").textContent = stats.name;
      document.getElementById("vs-my-score").textContent = `${stats.grandScore} / ${stats.grandTotal} (${pctStr})`;
      document.getElementById("vs-my-time").textContent = formatTime(stats.elapsedSec);
      document.getElementById("vs-my-acc").textContent = `${stats.accuracy}%`;

      document.getElementById("vs-opp-name").textContent = oppStats.name || state.opponent.name;
      document.getElementById("vs-opp-score").textContent = `${oppGrandScore} / ${oppGrandTotal} (${oppPctStr})`;
      document.getElementById("vs-opp-time").textContent = formatTime(oppStats.elapsedSec || 0);
      document.getElementById("vs-opp-acc").textContent = `${oppStats.accuracy || 90}%`;

      // Render multi-player ranked leaderboard when 3+ players
      const activeList = typeof getActiveBattlePlayers === "function" ? getActiveBattlePlayers() : [];
      let multiBoard = document.getElementById("settlement-multiplayer-board");
      if (activeList.length > 2 && vsBanner) {
        if (!multiBoard) {
          multiBoard = document.createElement("div");
          multiBoard.id = "settlement-multiplayer-board";
          multiBoard.className = "mt-3 pt-3 border-t border-slate-700/80 space-y-1.5 text-left";
          vsBanner.appendChild(multiBoard);
        }
        const ranked = [...activeList].sort((a, b) => {
          const aTot = (a.total || 0) + (a.stationTotal || 0);
          const bTot = (b.total || 0) + (b.stationTotal || 0);
          const aCur = (a.score || 0) + (a.stationScore || 0);
          const bCur = (b.score || 0) + (b.stationScore || 0);
          const aPct = aTot > 0 ? aCur / aTot : 0;
          const bPct = bTot > 0 ? bCur / bTot : 0;
          if (bPct !== aPct) return bPct - aPct;
          const aTime = a.finalStats?.elapsedSec ?? 999999;
          const bTime = b.finalStats?.elapsedSec ?? 999999;
          return aTime - bTime;
        });
        const medals = ["🥇", "🥈", "🥉"];
        multiBoard.innerHTML = `
          <div class="text-[11px] font-bold text-sky-300 uppercase tracking-wider">🏆 多人對戰即時排行榜</div>
          ${ranked.map((p, idx) => {
            const tot = (p.total || 0) + (p.stationTotal || 0);
            const cur = (p.score || 0) + (p.stationScore || 0);
            const pPct = tot > 0 ? ((cur / tot) * 100).toFixed(1) : "0.0";
            const tStr = p.finalStats ? formatTime(p.finalStats.elapsedSec) : "作答中";
            const stTag = p.finished ? (p.finishReason === "victory" ? "👑 通關" : "🏁 已結束") : "⏳ 作答中";
            return `
              <div class="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950/70 border ${p.id === state.localInstanceId ? "border-sky-500/60" : "border-slate-800"} text-xs">
                <span class="font-bold text-white">${medals[idx] || `#${idx + 1}`} ${p.name}${p.id === state.localInstanceId ? " (你)" : ""}</span>
                <span class="font-mono-num text-slate-300">${cur}/${tot} (${pPct}%) · ${tStr} · ${stTag}</span>
              </div>
            `;
          }).join("")}
        `;
        multiBoard.classList.remove("hidden");
      } else if (multiBoard) {
        multiBoard.classList.add("hidden");
      }
    } else {
      if (vsBanner) vsBanner.classList.add("hidden");
      if (oppOngoingBanner) {
        oppOngoingBanner.classList.remove("hidden");
        const liveText = document.getElementById("settlement-opp-live-text");
        if (liveText) {
          const oppCur = state.opponent.score + (state.opponent.stationScore || 0);
          const oppTot = state.opponent.total + (state.opponent.stationTotal || 0);
          liveText.textContent = `對手【${state.opponent.name}】作答中 (目前 ${oppCur}/${oppTot})，對手結束後將自動更新勝負結算！`;
        }
      }
      if (titleEl) titleEl.textContent = "我方已完成！等待對手作答";
      if (iconBox) iconBox.innerHTML = "⏳";
    }
  }

  document.getElementById("settlement-pct").textContent = pctStr;
  document.getElementById("settlement-grand-score").textContent = `${stats.grandScore} / ${stats.grandTotal} 題`;
  document.getElementById("settlement-time").textContent = formatTime(stats.elapsedSec);
  const avgSec = stats.grandScore > 0 ? (stats.elapsedSec / stats.grandScore).toFixed(1) : "0.0";
  document.getElementById("settlement-speed").textContent = `每題 ${avgSec} 秒`;
  document.getElementById("settlement-acc").textContent = `${stats.accuracy}%`;
  document.getElementById("settlement-wrong").textContent = `答錯 ${stats.wrongAttempts} 次`;
  document.getElementById("settlement-streak").textContent = `${stats.maxStreak} 題`;
  document.getElementById("settlement-breakdown").textContent = `${stats.adminCurrent}區 / ${stats.unlockedStCount}站`;

  modal.classList.remove("hidden");
  document.getElementById("btn-reopen-settlement")?.classList.add("hidden");
  if (window.lucide) lucide.createIcons();
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
  }
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

function downloadSettlementCard() {
  const stats = state.finalStats;
  if (!stats) return;

  const cvs = document.createElement("canvas");
  cvs.width = 1200;
  cvs.height = 675;
  const ctx = cvs.getContext("2d");

  // 1. Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
  bgGrad.addColorStop(0, "#070d18");
  bgGrad.addColorStop(0.5, "#0f172a");
  bgGrad.addColorStop(1, "#050811");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 675);

  // Ambient Radial Glows
  const glow1 = ctx.createRadialGradient(200, 120, 10, 200, 120, 350);
  glow1.addColorStop(0, "rgba(56, 189, 248, 0.15)");
  glow1.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, 600, 400);

  const glow2 = ctx.createRadialGradient(1000, 520, 10, 1000, 520, 350);
  glow2.addColorStop(0, "rgba(129, 140, 248, 0.14)");
  glow2.addColorStop(1, "rgba(129, 140, 248, 0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(600, 200, 600, 475);

  // Outer Border
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 24, 24, 1152, 627, 24, null, "rgba(148, 163, 184, 0.25)");

  // 2. Header
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("TAIWAN GEOMASTER TW · 挑戰成績單", 64, 76);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px 'Noto Sans TC', -apple-system, sans-serif";
  ctx.fillText("台灣行政區記憶大挑戰", 64, 118);

  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 16px 'Noto Sans TC', sans-serif";
  ctx.fillText(`挑戰者：${stats.name}`, 1136, 76);

  ctx.fillStyle = "#64748b";
  ctx.font = "14px -apple-system, sans-serif";
  ctx.fillText(`${stats.date || new Date().toLocaleDateString("zh-TW")}`, 1136, 106);
  ctx.textAlign = "left";

  // Divider
  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 138);
  ctx.lineTo(1136, 138);
  ctx.stroke();

  // 3. Banner (Single Player Grade or Multiplayer Win/Loss)
  const isMultiplayer = Boolean(state.opponent.connected || state.aiRivalTimer || state.opponent.finished);
  const oppStats = state.opponent.finalStats;
  const pctNum = stats.grandTotal > 0 ? ((stats.grandScore / stats.grandTotal) * 100) : 0;
  const pctStr = pctNum.toFixed(1) + "%";

  if (isMultiplayer && oppStats) {
    const oppScore = oppStats.grandScore || oppStats.score || 0;
    const oppTotal = oppStats.grandTotal || oppStats.total || stats.grandTotal;
    const oppPct = oppTotal > 0 ? ((oppScore / oppTotal) * 100).toFixed(1) + "%" : "0%";
    const isWin = stats.grandScore > oppScore || (stats.grandScore === oppScore && stats.elapsedSec <= (oppStats.elapsedSec || 999999));
    const isDraw = stats.grandScore === oppScore && stats.elapsedSec === (oppStats.elapsedSec || 999999);

    const bannerBg = isDraw ? "rgba(56, 189, 248, 0.15)" : isWin ? "rgba(16, 185, 129, 0.16)" : "rgba(244, 63, 94, 0.16)";
    const bannerBorder = isDraw ? "#38bdf8" : isWin ? "#10b981" : "#f43f5e";
    drawRoundedRect(ctx, 64, 156, 1072, 72, 16, bannerBg, bannerBorder);

    ctx.fillStyle = isDraw ? "#38bdf8" : isWin ? "#34d399" : "#fb7185";
    ctx.font = "bold 26px 'Noto Sans TC', sans-serif";
    const titleText = isDraw ? "⚖️ 勢均力敵 · 平手 (DRAW)" : isWin ? "👑 獲得勝利 · VICTORY" : "💔 遺憾惜敗 · DEFEAT";
    ctx.fillText(titleText, 88, 198);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "14px 'Noto Sans TC', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`我方: ${stats.grandScore}/${stats.grandTotal} (${pctStr})  vs  對手【${oppStats.name || "對手"}】: ${oppScore}/${oppTotal} (${oppPct})`, 1112, 198);
    ctx.textAlign = "left";
  } else {
    const gradeInfo = getGradeFromStats(stats);
    drawRoundedRect(ctx, 64, 156, 1072, 72, 16, "rgba(245, 158, 11, 0.14)", "#f59e0b");
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 26px 'Noto Sans TC', sans-serif";
    ctx.fillText(`🏆 挑戰評級：【${gradeInfo.grade}】· ${gradeInfo.title}`, 88, 198);

    ctx.fillStyle = "#fef3c7";
    ctx.font = "14px 'Noto Sans TC', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(gradeInfo.desc, 1112, 198);
    ctx.textAlign = "left";
  }

  // 4. Hero Score Box
  drawRoundedRect(ctx, 64, 248, 480, 280, 20, "rgba(15, 23, 42, 0.75)", "#334155");
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 15px 'Noto Sans TC', sans-serif";
  ctx.fillText("最終挑戰完成率", 96, 288);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 76px 'JetBrains Mono', sans-serif";
  ctx.fillText(pctStr, 96, 375);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Noto Sans TC', sans-serif";
  ctx.fillText(`總計完成：${stats.grandScore} / ${stats.grandTotal} 題`, 96, 428);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px 'Noto Sans TC', sans-serif";
  ctx.fillText(`行政區：${stats.adminCurrent} / ${stats.adminTotal}  ·  車站：${stats.unlockedStCount} / ${stats.stationTotal}`, 96, 465);

  const pBarW = 416;
  drawRoundedRect(ctx, 96, 486, pBarW, 10, 5, "#1e293b", null);
  const fillW = Math.max(8, Math.min(pBarW, (stats.grandScore / Math.max(1, stats.grandTotal)) * pBarW));
  drawRoundedRect(ctx, 96, 486, fillW, 10, 5, "#38bdf8", null);

  // 5. 2x2 Metric Cards
  const diffNames = { casual: "休閒提示", county_only: "縣市挑戰", hard_full: "困難全名", master_hierarchy: "三階宗師" };
  const diffLabel = diffNames[state.difficulty] || state.difficulty;
  const avgSec = stats.grandScore > 0 ? (stats.elapsedSec / stats.grandScore).toFixed(1) : "0.0";

  const cards = [
    { title: "⏱️ 總計耗時", val: formatTime(stats.elapsedSec), sub: `平均每題 ${avgSec} 秒`, x: 568, y: 248, color: "#ffffff" },
    { title: "🎯 答題正確率", val: `${stats.accuracy}%`, sub: `答對 ${stats.grandScore} · 答錯 ${stats.wrongAttempts} 次`, x: 864, y: 248, color: "#34d399" },
    { title: "🔥 最高連對", val: `${stats.maxStreak} 題`, sub: "無間斷連續答對紀錄", x: 568, y: 396, color: "#f59e0b" },
    { title: "🗺️ 挑戰模式", val: diffLabel, sub: state.selectedCounties.size === 22 ? "全台 368 行政區" : `自選 ${state.selectedCounties.size} 縣市`, x: 864, y: 396, color: "#38bdf8" }
  ];

  cards.forEach((c) => {
    drawRoundedRect(ctx, c.x, c.y, 272, 132, 18, "rgba(15, 23, 42, 0.75)", "#334155");
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px 'Noto Sans TC', sans-serif";
    ctx.fillText(c.title, c.x + 22, c.y + 36);

    ctx.fillStyle = c.color;
    ctx.font = "bold 26px 'JetBrains Mono', 'Noto Sans TC', sans-serif";
    ctx.fillText(c.val, c.x + 22, c.y + 78);

    ctx.fillStyle = "#64748b";
    ctx.font = "12px 'Noto Sans TC', sans-serif";
    ctx.fillText(c.sub, c.x + 22, c.y + 108);
  });

  // 6. Footer Watermark
  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 550);
  ctx.lineTo(1136, 550);
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "14px 'Noto Sans TC', sans-serif";
  ctx.fillText("TAIWAN GEOMASTER TW · 探索台灣每一寸土地", 64, 588);

  ctx.textAlign = "right";
  ctx.fillStyle = "#475569";
  ctx.font = "12px -apple-system, sans-serif";
  ctx.fillText(window.location.href || "Taiwan GeoMaster Pro", 1136, 588);
  ctx.textAlign = "left";

  // Trigger Download
  const link = document.createElement("a");
  link.download = `Taiwan-GeoMaster-Scorecard-${Date.now()}.png`;
  link.href = cvs.toDataURL("image/png");
  link.click();
  setFeedback("📥 已成功生成並下載高解析度挑戰成績單圖片！", "success");
}

function formatSettlementShareText(stats, isMultiplayer, oppStats) {
  const diffNames = {
    casual: "休閒提示",
    county_only: "縣市挑戰",
    hard_full: "困難全名",
    master_hierarchy: "三階宗師"
  };
  const diffLabel = diffNames[state.difficulty] || state.difficulty;
  const pctStr = stats.grandTotal > 0 ? ((stats.grandScore / stats.grandTotal) * 100).toFixed(1) + "%" : "0%";

  let resultLine = "";
  if (isMultiplayer && oppStats) {
    const isWin = stats.grandScore > oppStats.grandScore || (stats.grandScore === oppStats.grandScore && stats.elapsedSec <= oppStats.elapsedSec);
    resultLine = isWin ? `🏆 對戰結果：👑 獲得勝利！(vs ${oppStats.name})` : `🏆 對戰結果：💔 遺憾惜敗 (vs ${oppStats.name})`;
  } else {
    const grade = getGradeFromStats(stats);
    resultLine = `🏆 評級稱號：【${grade.grade}】· ${grade.title}`;
  }

  return [
    `🗺️ 【Taiwan GeoMaster Pro · 台灣地理挑戰成績單】`,
    `👤 挑戰者：${stats.name}`,
    resultLine,
    `📊 總完成度：${pctStr} (${stats.grandScore} / ${stats.grandTotal} 題)`,
    `⏱️ 總計耗時：${formatTime(stats.elapsedSec)}`,
    `🎯 答題正確率：${stats.accuracy}% (答錯 ${stats.wrongAttempts} 次)`,
    `🔥 最高連擊：${stats.maxStreak} 連對`,
    `🎮 難度模式：${diffLabel}`,
    `--------------------------`,
    `挑戰你的台灣地理極限：${window.location.origin}${window.location.pathname}`
  ].join("\n");
}

function shareSettlementCard() {
  const stats = state.finalStats;
  if (!stats) return;

  const isMultiplayer = Boolean(state.opponent.connected || state.aiRivalTimer || state.opponent.finished);
  const oppStats = state.opponent.finalStats;
  const text = formatSettlementShareText(stats, isMultiplayer, oppStats);

  if (navigator.share) {
    navigator.share({
      title: "Taiwan GeoMaster Pro · 台灣地理挑戰成績單",
      text: text,
      url: window.location.href
    }).catch(() => {
      copyToClipboard(text);
    });
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(text).then(() => {
      setFeedback("📋 已成功複製挑戰成績單至剪貼簿！", "success");
    }).catch(() => {
      fallbackCopy(text);
    });
  } catch (_) {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
  setFeedback("📋 已成功複製挑戰成績單至剪貼簿！", "success");
}

function resetGame() {
  stopTimer();
  state.unlockedTowns.clear();
  state.unlockedCounties.clear();
  state.unlockedProvinces.clear();
  state.missedTowns.clear();
  state.unlockedStations.clear();
  state.missedStations.clear();
  state.targetStationKey = null;
  state.isGameOver = false;
  state.finished = false;
  state.promptedLastPlayer = false;
  state.finalStats = null;
  state.elapsedSec = 0;
  state.targetId = null;

  if (state.opponent) {
    state.opponent.finished = false;
    state.opponent.finalStats = null;
  }

  state.stats = {
    totalAttempts: 0,
    correctAttempts: 0,
    wrongAttempts: 0,
    streak: 0,
    maxStreak: 0
  };

  document.getElementById("modal-settlement")?.classList.add("hidden");
  document.getElementById("modal-opponent-finished")?.classList.add("hidden");
  document.getElementById("modal-rematch-confirm")?.classList.add("hidden");
  document.getElementById("btn-reopen-settlement")?.classList.add("hidden");

  const rematchBtn = document.getElementById("btn-rematch-settlement");
  const rematchText = document.getElementById("rematch-btn-text");
  if (rematchBtn) rematchBtn.disabled = false;
  if (rematchText) rematchText.textContent = state.opponent.connected ? "發起重開對戰" : "再玩一局";

  updateRoadAndRailwayTileOverlays();

  document.getElementById("timer-display").textContent =
    state.timerMode === "down" ? formatTime(state.countdownTotalSec) : "00:00";

  updatePrefixDropdownUI();
  updateScoreAndProgressUI();
  if (state.playMode === "target_random") {
    pickNextTargetRegion();
  } else {
    updateTargetBannerUI();
    refreshAllPolygonStyles();
  }
  setFeedback("新的一局已準備就緒，輸入第一個行政區即開始計時！", "info");
  broadcastP2PState("重新開局");
}

// ============================================================================
// 9. TIMER & COUNTDOWN ENGINE
// ============================================================================
function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerRunning = true;
  state.timerInterval = setInterval(() => {
    state.elapsedSec++;
    const disp = document.getElementById("timer-display");
    if (state.timerMode === "up") {
      disp.textContent = formatTime(state.elapsedSec);
      disp.className = "font-mono-num text-sm sm:text-base font-bold text-white tracking-wider";
    } else {
      const left = state.countdownTotalSec - state.elapsedSec;
      disp.textContent = formatTime(left);
      if (left <= 30) {
        disp.className = "font-mono-num text-sm sm:text-base font-bold text-rose-400 animate-pulse tracking-wider";
      } else {
        disp.className = "font-mono-num text-sm sm:text-base font-bold text-amber-300 tracking-wider";
      }
      if (left <= 0) {
        finishGame("timeout");
      }
    }
  }, 1000);
}

function stopTimer() {
  state.timerRunning = false;
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}
