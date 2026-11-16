// =========================================================================
// 8. SPOILER-FREE PROGRESS DASHBOARD & QUICK COUNTY ZOOM CHIPS
// =========================================================================
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
    if (cLabelEl) cLabelEl.textContent = "🛤️ 已選路線數";
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

  // Render Dynamic Multi-Category Progress Bars (總進度 / 地區 / 台鐵 / 高鐵 / 捷運 / 輕軌 / 纜車 / 林鐵 / 糖鐵 — 有開才顯示!)
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
    // 3. 軌道各系統 (台鐵 / 高鐵 / 捷運 / 輕軌 / 纜車 / 林鐵 / 糖鐵 — 有開才顯示!)
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
    if (bar) bar.innerHTML = `<span class="text-[11px] text-slate-500 italic">目前為純車站模式或尚未解鎖縣市（可點下方各路線卡片快速放大至該路線！）</span>`;
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
    const activeLineSet = state.stationQuizEnabled && state.quizStationLines.size > 0
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
        const barColor = stArr[0]?.color || "#ec4899";

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
          setFeedback(`📍 已放大至「${sysName}」全線範圍（已完成 ${unlockedS}/${totalS} 站 · ${pctS}%）`, "info");
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
      if (line.isHighway || !activeLineSet.has(line.id)) return;
      const meta = LINE_DISPLAY_META[line.id] || { dotName: line.name };
      const lineStations = activeSt.filter((s) => s.lineIds && s.lineIds.includes(line.id));
      if (lineStations.length === 0) return;

      const totalL = lineStations.length;
      const unlockedL = lineStations.filter((s) => state.unlockedStations.has(s.key)).length;
      const pctL = totalL > 0 ? ((unlockedL / totalL) * 100).toFixed(1) : "0.0";
      const isLineDone = unlockedL === totalL && totalL > 0;

      const lRow = document.createElement("div");
      lRow.className = "p-2.5 rounded-xl bg-slate-900/75 hover:bg-slate-800/85 border border-slate-800 cursor-pointer transition flex flex-col gap-1";
      lRow.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 font-bold text-slate-100 truncate">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${line.color}"></span>
            <span class="truncate">${meta.dotName}</span>
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
        setFeedback(`📍 已放大至「${meta.dotName}」（已完成 ${unlockedL}/${totalL} 站 · ${pctL}%）`, "info");
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
      <div class="text-xs font-bold text-amber-300">🔒 尚有 ${hiddenCount} 個未解鎖縣市已隱藏名稱（防止劇透）</div>
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
    stopTimer();
    state.isGameOver = true;
    playTone("tier");
    const desc =
      adminTotal > 0 && activeSt.length > 0
        ? `${adminTotal} 個行政區與 ${activeSt.length} 座車站`
        : activeSt.length > 0
        ? `${activeSt.length} 座車站`
        : `${adminTotal} 個行政區`;
    setFeedback(`🎉 恭喜全數通關！共完成 ${desc}，耗時 ${formatTime(state.elapsedSec)}！`, "tier");
  }
}

function giveUpAndReveal() {
  stopTimer();
  state.isGameOver = true;
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
  updateRoadAndRailwayTileOverlays();
  refreshAllPolygonStyles();
  updateScoreAndProgressUI();
  setFeedback(`已結束本局並揭曉所有行政區與車站名稱！`, "warn");
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
  state.elapsedSec = 0;
  state.targetId = null;
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

// =========================================================================
// 9. TIMER & COUNTDOWN ENGINE
// =========================================================================
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
        giveUpAndReveal();
        setFeedback("⏰ 倒數時間到！已自動結算並揭曉未完成的行政區。", "error");
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
