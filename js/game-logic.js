// =========================================================================
// 6. GAME LOGIC: SPOILER-FREE PREFIXES, SMART SUFFIX OVERRIDE & WINDOWS IME FIX
// =========================================================================
function getScopeTowns() {
  return ALL_TOWNS.filter((t) => state.selectedCounties.has(t.countyName));
}

function getScopeCounties() {
  return TAIWAN_ADMIN_DATA.filter((c) => state.selectedCounties.has(c.name));
}

function isCountyRevealed(countyName) {
  if (state.isGameOver || state.difficulty === "casual" || state.difficulty === "hard_suffix") return true;
  if (state.unlockedCounties.has(countyName)) return true;
  if (state.difficulty === "hard_full") {
    return ALL_TOWNS.some((t) => t.countyName === countyName && state.unlockedTowns.has(t.id));
  }
  return false;
}

function updatePrefixDropdownUI() {
  const select = document.getElementById("prefix-select");
  const pillsWrap = document.getElementById("unlocked-prefix-pills");
  const guideBar = document.getElementById("hierarchy-guide-bar");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = `<option value="">無固定前綴 (自由打)</option>`;

  const prefixOptions = [];

  if (state.difficulty === "master_hierarchy") {
    guideBar.classList.remove("hidden");
    const twUnlocked = state.unlockedProvinces.has("臺灣省");
    const fjUnlocked = state.unlockedProvinces.has("福建省");
    const twBadge = document.getElementById("prov-tw-badge");
    const fjBadge = document.getElementById("prov-fj-badge");
    if (twBadge) {
      twBadge.textContent = twUnlocked ? "臺灣省: ✓已解鎖" : "臺灣省: 未解鎖";
      twBadge.className = twUnlocked
        ? "px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
        : "px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700";
    }
    if (fjBadge) {
      fjBadge.textContent = fjUnlocked ? "福建省: ✓已解鎖" : "福建省: 未解鎖";
      fjBadge.className = fjUnlocked
        ? "px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
        : "px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700";
    }

    if (twUnlocked) prefixOptions.push({ val: "臺灣省", label: "省前綴：臺灣省" });
    if (fjUnlocked) prefixOptions.push({ val: "福建省", label: "省前綴：福建省" });

    TAIWAN_ADMIN_DATA.forEach((c) => {
      if (!state.selectedCounties.has(c.name)) return;
      if (state.unlockedCounties.has(c.name)) {
        const fullPrefix = c.isSpecial ? c.name : `${c.province}${c.name}`;
        prefixOptions.push({ val: fullPrefix, label: `${fullPrefix}` });
      }
    });

    if (pillsWrap) {
      if (prefixOptions.length === 0) {
        pillsWrap.innerHTML = `<span class="text-[11px] text-slate-400 shrink-0">已解鎖前綴：</span><span class="text-[11px] text-slate-500 italic">尚未解鎖任何省或直轄市（請先輸入「臺灣省」、「福建省」或「臺北市」等六都）</span>`;
      } else {
        pillsWrap.innerHTML = `<span class="text-[11px] text-slate-400 shrink-0">點選套用前綴：</span>`;
        prefixOptions.forEach((opt) => {
          const btn = document.createElement("button");
          btn.type = "button";
          const isSelected = currentVal === opt.val;
          btn.className = isSelected
            ? "px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500 text-white shrink-0 transition"
            : "px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 shrink-0 transition";
          btn.textContent = opt.val;
          btn.addEventListener("click", () => {
            select.value = select.value === opt.val ? "" : opt.val;
            updatePrefixDropdownUI();
            updateLiveCombinedPreview();
            document.getElementById("answer-input").focus();
          });
          pillsWrap.appendChild(btn);
        });
      }
    }
  } else if (state.difficulty === "hard_full") {
    guideBar.classList.add("hidden");
    TAIWAN_ADMIN_DATA.forEach((c) => {
      if (!state.selectedCounties.has(c.name)) return;
      if (isCountyRevealed(c.name)) {
        prefixOptions.push({ val: c.name, label: c.name });
      }
    });
  } else if (state.difficulty === "county_only") {
    guideBar.classList.add("hidden");
    prefixOptions.push({ val: "臺灣省", label: "臺灣省" });
    prefixOptions.push({ val: "福建省", label: "福建省" });
  } else {
    guideBar.classList.add("hidden");
    TAIWAN_ADMIN_DATA.forEach((c) => {
      if (!state.selectedCounties.has(c.name)) return;
      prefixOptions.push({ val: c.name, label: c.name });
    });
  }

  prefixOptions.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.val;
    o.textContent = opt.label;
    select.appendChild(o);
  });

  if (prefixOptions.some((o) => o.val === currentVal)) {
    select.value = currentVal;
  }
}

const VALID_TOWN_SUFFIXES = new Set(["區", "鄉", "鎮", "市"]);
const EXACT_TOWN_NAMES_SET = new Set(ALL_TOWNS.map((t) => normTw(t.townName)));
const EXACT_COUNTY_NAMES_SET = new Set(TAIWAN_ADMIN_DATA.map((c) => normTw(c.name)));

function buildCombinedInput(prefix, core, suffix) {
  let c = normTw(core);
  if (!c) return "";
  const p = normTw(prefix);
  const s = normTw(suffix);

  // 1. Resolve Suffix first (before prepending prefix)
  // Do not append suffix if user is typing a Province or County name directly (e.g. 臺灣省, 花蓮縣)
  const isProvOrCountyOnly =
    c === "臺灣省" || c === "福建省" || EXACT_COUNTY_NAMES_SET.has(c);

  if (s && !isProvOrCountyOnly && !c.endsWith(s)) {
    // Check if c (or its town part after any county prefix) is ALREADY a complete valid townName (e.g. 虎尾鎮, 花蓮市)
    let townPart = c;
    for (const county of TAIWAN_ADMIN_DATA) {
      const cn = normTw(county.name);
      const pn = normTw(county.province + county.name);
      if (townPart.startsWith(pn) && townPart.length > pn.length) {
        townPart = townPart.slice(pn.length);
        break;
      } else if (townPart.startsWith(cn) && townPart.length > cn.length) {
        townPart = townPart.slice(cn.length);
        break;
      }
    }
    if (EXACT_TOWN_NAMES_SET.has(townPart)) {
      // User explicitly typed a complete valid town name (e.g. typed 虎尾鎮 while 鄉 was selected) -> keep it!
    } else {
      c = c + s;
    }
  }

  // 2. Resolve Prefix without false-positive matching on county.short (so 花蓮市 / 宜蘭市 / 苗栗市 / 彰化市 / 南投市 / 屏東市 / 臺東市 / 桃園區 work!)
  if (p) {
    if (c.startsWith(p)) {
      // Already starts with exact prefix
    } else if ((p === "臺灣省" || p === "福建省") && !c.startsWith("臺灣省") && !c.startsWith("福建省")) {
      c = p + c;
    } else {
      // Check if c already starts with a full County Name (e.g. 花蓮縣花蓮市) or Province+County Name
      const startsWithFullCounty =
        c.startsWith("臺灣省") ||
        c.startsWith("福建省") ||
        TAIWAN_ADMIN_DATA.some((county) => c.startsWith(normTw(county.name)));

      if (!startsWithFullCounty) {
        c = p + c;
      } else if (p.startsWith("臺灣省") && c.startsWith(p.slice(3))) {
        // e.g. p is "臺灣省花蓮縣" and user typed "花蓮縣花蓮市" -> combine cleanly into "臺灣省花蓮縣花蓮市"
        c = "臺灣省" + c;
      } else if (p.startsWith("福建省") && c.startsWith(p.slice(3))) {
        c = "福建省" + c;
      }
    }
  }
  return c;
}

function updateLiveCombinedPreview() {
  const prefix = document.getElementById("prefix-select").value;
  const core = document.getElementById("answer-input").value.trim();
  const suffix = document.getElementById("suffix-input").value.trim();
  const badge = document.getElementById("live-preview-combined");
  if (!badge) return;

  if ((prefix || suffix) && core) {
    const combined = buildCombinedInput(prefix, core, suffix);
    badge.textContent = `識別: ${combined}`;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

// Windows IME-safe input clearing:
// Never clear during active composition; if called on Enter/Submit, reset value cleanly after composition flushes.
function clearCoreInput() {
  const input = document.getElementById("answer-input");
  if (!input) return;
  input.value = "";
  updateLiveCombinedPreview();
}

function evaluateGuess(rawInput, isAutoCheck = false) {
  // CRITICAL WINDOWS IME FIX: Never auto-evaluate or clear input while IME composition (dotted underline) is active!
  if (isAutoCheck && state.isImeComposing) return false;
  if (state.isGameOver) return false;

  const prefix = document.getElementById("prefix-select").value;
  const suffix = document.getElementById("suffix-input").value.trim();
  const core = rawInput.trim();
  if (!core) return false;

  const combined = buildCombinedInput(prefix, core, suffix);
  const cleanCore = normTw(core);

  if (!state.timerRunning && state.elapsedSec === 0) {
    startTimer();
  }

  // CASE 0: PURE STATION QUIZ MODE (0 counties selected) OR TARGETED STATION DOT OR "站" SUFFIX
  const isPureStationQuiz = state.selectedCounties.size === 0 && getActiveQuizStations().length > 0;
  if (
    (state.transportMode !== "off" || state.stationQuizEnabled) &&
    (isPureStationQuiz || state.targetStationKey || core.endsWith("站") || suffix === "站")
  ) {
    if (tryMatchAndUnlockStation(core, combined, isAutoCheck)) {
      return true;
    }
    if (isPureStationQuiz || state.targetStationKey || core.endsWith("站") || suffix === "站") {
      if (!isAutoCheck) triggerWrongFeedback(`找不到或已解鎖車站：「${combined}」`);
      return false;
    }
  }

  // CASE A: TARGET QUIZ MODE
  if (state.playMode === "target_random" || state.playMode === "target_click") {
    if (!state.targetId) {
      if (!isAutoCheck) setFeedback("請先在地圖上點選一個目標區塊，或點擊「換一題」！", "warn");
      return false;
    }

    if (state.difficulty === "county_only") {
      const targetCounty = COUNTY_BY_NAME[state.targetId];
      if (!targetCounty) return false;
      const ok =
        combined === normTw(targetCounty.name) ||
        cleanCore === normTw(targetCounty.name) ||
        cleanCore === normTw(targetCounty.short);
      if (ok) {
        state.unlockedCounties.add(targetCounty.name);
        state.lastTargetLat = targetCounty.lat;
        state.lastTargetLng = targetCounty.lng;
        onSuccessfulUnlock(`🎯 答對指定縣市：${targetCounty.name}！（可按方向鍵 ↑↓←→ 移至相鄰縣市或點選下一個）`, targetCounty.name, true);
        if (state.playMode === "target_random") {
          pickNextTargetRegion();
        } else {
          state.targetId = null;
          updateTargetBannerUI();
          refreshAllPolygonStyles();
        }
        return true;
      }
      if (!isAutoCheck) triggerWrongFeedback(`答案不是「${combined}」，再仔細看看位置！`);
      return false;
    }

    const targetTown = ALL_TOWNS.find((t) => t.id === state.targetId);
    if (!targetTown) return false;

    let isMatch = false;
    if (state.difficulty === "casual") {
      isMatch =
        cleanCore === normTw(targetTown.baseName) ||
        cleanCore === normTw(targetTown.townName) ||
        combined === normTw(targetTown.townName) ||
        combined === normTw(targetTown.fullCountyTown) ||
        combined === normTw(targetTown.fullHierarchyName);
    } else if (state.difficulty === "hard_suffix") {
      isMatch =
        combined === normTw(targetTown.townName) ||
        cleanCore === normTw(targetTown.townName) ||
        combined === normTw(targetTown.fullCountyTown) ||
        cleanCore === normTw(targetTown.fullCountyTown) ||
        combined === normTw(targetTown.fullHierarchyName);
    } else {
      isMatch =
        combined === normTw(targetTown.fullHierarchyName) ||
        cleanCore === normTw(targetTown.fullHierarchyName) ||
        combined === normTw(targetTown.fullCountyTown) ||
        cleanCore === normTw(targetTown.fullCountyTown);
    }

    if (isMatch) {
      state.unlockedTowns.add(targetTown.id);
      state.unlockedCounties.add(targetTown.countyName);
      state.unlockedProvinces.add(targetTown.isSpecial ? targetTown.countyName : targetTown.province);
      state.lastTargetLat = targetTown.lat;
      state.lastTargetLng = targetTown.lng;
      updatePrefixDropdownUI();
      onSuccessfulUnlock(`🎯 精準命中：${targetTown.fullHierarchyName}！（按方向鍵 ↑↓←→ 可移至相鄰區塊，或直接點選地圖）`, targetTown.fullCountyTown, true);
      if (state.playMode === "target_random") {
        pickNextTargetRegion();
      } else {
        // In target_click mode: stay at original position! Do not jump randomly!
        state.targetId = null;
        updateTargetBannerUI();
        refreshAllPolygonStyles();
      }
      return true;
    } else {
      if (!isAutoCheck) {
        const reqHint =
          state.difficulty === "casual"
            ? "（普通難度只需輸入鄉鎮名稱）"
            : state.difficulty === "hard_suffix"
            ? "（進階後綴模式需含正確鄉/鎮/市/區後綴）"
            : "（困難全名模式需含完整縣市+鄉鎮市區全名）";
        triggerWrongFeedback(`與指定區塊不符 ${reqHint}`);
      }
      return false;
    }
  }

  // CASE B: FREE RECALL - COUNTY ONLY MODE
  if (state.difficulty === "county_only") {
    const matchedCounty = getScopeCounties().find(
      (c) =>
        !state.unlockedCounties.has(c.name) &&
        (combined === normTw(c.name) ||
          cleanCore === normTw(c.name) ||
          cleanCore === normTw(c.short) ||
          combined === normTw(`${c.province}${c.name}`))
    );
    if (matchedCounty) {
      state.unlockedCounties.add(matchedCounty.name);
      onSuccessfulUnlock(`🎉 解鎖縣市：${matchedCounty.name}（可點右側標籤直接放大定位）`, matchedCounty.name, true);
      return true;
    }
    if (!isAutoCheck) triggerWrongFeedback(`找不到未解鎖的縣市「${combined}」`);
    return false;
  }

  // CASE C: FREE RECALL - MASTER HIERARCHY MODE
  if (state.difficulty === "master_hierarchy") {
    if (cleanCore === "臺灣省" || cleanCore === "福建省") {
      if (!state.unlockedProvinces.has(cleanCore)) {
        state.unlockedProvinces.add(cleanCore);
        playTone("tier");
        updatePrefixDropdownUI();
        document.getElementById("prefix-select").value = cleanCore;
        clearCoreInput();
        refreshAllPolygonStyles();
        setFeedback(`👑 第一階突破！已解鎖「${cleanCore}」，並已自動設為前綴，現在可猜其下轄縣市！`, "tier");
        return true;
      } else if (!isAutoCheck) {
        setFeedback(`「${cleanCore}」已經解鎖過囉！已為你切換前綴為 ${cleanCore}`, "info");
        document.getElementById("prefix-select").value = cleanCore;
        clearCoreInput();
        return true;
      }
    }

    const specialMatch = getScopeCounties().find(
      (c) => c.isSpecial && (cleanCore === normTw(c.name) || combined === normTw(c.name))
    );
    if (specialMatch) {
      if (!state.unlockedCounties.has(specialMatch.name)) {
        state.unlockedProvinces.add(specialMatch.name);
        state.unlockedCounties.add(specialMatch.name);
        playTone("tier");
        updatePrefixDropdownUI();
        document.getElementById("prefix-select").value = specialMatch.name;
        document.getElementById("suffix-input").value = "區";
        clearCoreInput();
        refreshAllPolygonStyles();
        updateScoreAndProgressUI();
        setFeedback(`🏙️ 解鎖直轄市「${specialMatch.name}」！已自動鎖定前綴「${specialMatch.name}」與後綴「區」！`, "tier");
        return true;
      } else if (!isAutoCheck) {
        document.getElementById("prefix-select").value = specialMatch.name;
        clearCoreInput();
        setFeedback(`已切換前綴為「${specialMatch.name}」`, "info");
        return true;
      }
    }

    const countyMatch = getScopeCounties().find(
      (c) =>
        !c.isSpecial &&
        (combined === normTw(`${c.province}${c.name}`) ||
          (state.unlockedProvinces.has(c.province) && cleanCore === normTw(c.name)))
    );
    if (countyMatch) {
      if (!state.unlockedProvinces.has(countyMatch.province)) {
        if (!isAutoCheck) {
          triggerWrongFeedback(`🔒 階層鎖定：必須先猜出頂層「${countyMatch.province}」，才能解鎖「${countyMatch.name}」喔！`);
        }
        return false;
      }
      if (!state.unlockedCounties.has(countyMatch.name)) {
        state.unlockedCounties.add(countyMatch.name);
        playTone("tier");
        const fullPrefix = `${countyMatch.province}${countyMatch.name}`;
        updatePrefixDropdownUI();
        document.getElementById("prefix-select").value = fullPrefix;
        clearCoreInput();
        refreshAllPolygonStyles();
        updateScoreAndProgressUI();
        setFeedback(`🗺️ 第二階突破！已解鎖「${fullPrefix}」並設為前綴，現在可輸入該縣市的鄉鎮市區！`, "tier");
        return true;
      } else if (!isAutoCheck) {
        document.getElementById("prefix-select").value = `${countyMatch.province}${countyMatch.name}`;
        clearCoreInput();
        setFeedback(`已切換前綴為「${countyMatch.province}${countyMatch.name}」`, "info");
        return true;
      }
    }

    const candidateTowns = getScopeTowns().filter(
      (t) =>
        normTw(t.fullHierarchyName) === combined ||
        (state.unlockedCounties.has(t.countyName) &&
          normTw(t.fullCountyTown) === combined)
    );
    if (candidateTowns.length > 0) {
      const t = candidateTowns[0];
      if (!state.unlockedCounties.has(t.countyName)) {
        if (!isAutoCheck) {
          const needed = t.isSpecial ? t.countyName : `${t.province} ➔ ${t.countyName}`;
          triggerWrongFeedback(`🔒 階層鎖定：請先依序解鎖「${needed}」，才能猜「${t.townName}」！`);
        }
        return false;
      }
      if (state.unlockedTowns.has(t.id)) {
        if (!isAutoCheck) setFeedback(`「${t.fullHierarchyName}」已經答對過囉！`, "info");
        return false;
      }
      state.unlockedTowns.add(t.id);
      onSuccessfulUnlock(`✨ 解鎖：${t.fullHierarchyName}`, t.fullCountyTown, false);
      return true;
    }

    if (!isAutoCheck) {
      triggerWrongFeedback(`無法匹配「${combined}」（請確認省/縣市是否已解鎖，且包含正確鄉鎮市區後綴）`);
    }
    return false;
  }

  // CASE D1: FREE RECALL - HARD SUFFIX MODE (較簡單的困難：免縣市前綴，僅需正確鄉鎮市區+後綴，如「信義區」、「虎尾鎮」)
  if (state.difficulty === "hard_suffix") {
    const normPrefix = normTw(prefix);
    const matched = getScopeTowns().filter((t) => {
      if (state.unlockedTowns.has(t.id)) return false;
      // If user explicitly selected a county prefix in dropdown and didn't type a different full county name, scope to that county
      if (normPrefix && combined === normTw(`${normPrefix}${t.townName}`)) {
        return normTw(t.countyName) === normPrefix;
      }
      return (
        combined === normTw(t.fullCountyTown) ||
        combined === normTw(t.fullHierarchyName) ||
        cleanCore === normTw(t.fullCountyTown) ||
        combined === normTw(t.townName) ||
        (!normPrefix && cleanCore === normTw(t.townName))
      );
    });
    if (matched.length > 0) {
      matched.forEach((t) => {
        state.unlockedTowns.add(t.id);
        state.unlockedCounties.add(t.countyName);
      });
      updatePrefixDropdownUI();
      const labelStr =
        matched.length > 1
          ? `一次解鎖 ${matched.length} 個同名行政區：${matched.map((m) => m.fullCountyTown).join("、")}`
          : `解鎖：${matched[0].fullCountyTown}`;
      onSuccessfulUnlock(labelStr, matched[0].fullCountyTown, false);
      return true;
    }
    if (state.transportMode !== "off" && tryMatchAndUnlockStation(core, combined, isAutoCheck)) {
      return true;
    }
    if (!isAutoCheck) {
      triggerWrongFeedback(`找不到或後綴不符：「${combined}」（進階後綴模式需含正確鄉/鎮/市/區後綴，或輸入車站名稱）`);
    }
    return false;
  }

  // CASE D2: FREE RECALL - STRICT HARD FULL NAME MODE (嚴格困難：必須包含「縣市＋鄉鎮市區＋後綴」，無前綴只打「信義區」絕不匹配、絕不跨縣市偷渡解鎖！)
  if (state.difficulty === "hard_full") {
    // Allow typing a County Name (e.g. 臺北市, 基隆市, 雲林縣) to unlock & switch the prefix dropdown
    const directCounty = getScopeCounties().find(
      (c) => cleanCore === normTw(c.name) || (!prefix && combined === normTw(c.name))
    );
    if (directCounty) {
      const wasUnlocked = state.unlockedCounties.has(directCounty.name);
      if (!wasUnlocked) {
        state.unlockedCounties.add(directCounty.name);
        playTone("tier");
        updatePrefixDropdownUI();
        document.getElementById("prefix-select").value = directCounty.name;
        clearCoreInput();
        refreshAllPolygonStyles();
        updateScoreAndProgressUI();
        setFeedback(`🔓 已解鎖縣市前綴「${directCounty.name}」並自動選取！現在可直接輸入其下轄鄉鎮市區`, "tier");
        return true;
      } else if (!isAutoCheck) {
        document.getElementById("prefix-select").value = directCounty.name;
        clearCoreInput();
        updateLiveCombinedPreview();
        setFeedback(`📍 已切換縣市前綴為「${directCounty.name}」`, "info");
        return true;
      }
    }

    // Strict full County+Township match ONLY (never match bare t.townName!)
    const matched = getScopeTowns().filter(
      (t) =>
        !state.unlockedTowns.has(t.id) &&
        (combined === normTw(t.fullCountyTown) ||
          combined === normTw(t.fullHierarchyName) ||
          (!prefix && cleanCore === normTw(t.fullCountyTown)) ||
          (!prefix && cleanCore === normTw(t.fullHierarchyName)))
    );
    if (matched.length > 0) {
      const t = matched[0];
      const wasCountyUnlocked = state.unlockedCounties.has(t.countyName);
      state.unlockedTowns.add(t.id);
      state.unlockedCounties.add(t.countyName);
      updatePrefixDropdownUI();
      // If user typed full "臺北市信義區" while prefix was empty, auto-select "臺北市" in prefix dropdown for convenience
      const prefixSelect = document.getElementById("prefix-select");
      if (prefixSelect && !prefixSelect.value) {
        prefixSelect.value = t.countyName;
      }
      onSuccessfulUnlock(
        wasCountyUnlocked ? `解鎖：${t.fullCountyTown}` : `🔓 解鎖「${t.countyName}」與「${t.fullCountyTown}」！`,
        t.fullCountyTown,
        false
      );
      return true;
    }
    if (state.transportMode !== "off" && tryMatchAndUnlockStation(core, combined, isAutoCheck)) {
      return true;
    }
    if (!isAutoCheck) {
      const townOnlyCandidate = getScopeTowns().find(
        (t) => cleanCore === normTw(t.townName) || combined === normTw(t.townName)
      );
      if (townOnlyCandidate && !prefix) {
        triggerWrongFeedback(
          `⚠️ 困難全名模式不可只打「${combined}」！請加上縣市全名（如：${townOnlyCandidate.fullCountyTown}）或先輸入縣市解鎖前綴（想免打縣市可改選「進階後綴模式」）`
        );
      } else {
        triggerWrongFeedback(`找不到或未含完整縣市+鄉鎮市區後綴：「${combined}」`);
      }
    }
    return false;
  }

  // CASE E: FREE RECALL - CASUAL / ORIGINAL MODE
  const matchedCasual = getScopeTowns().filter((t) => {
    if (state.unlockedTowns.has(t.id)) return false;
    const cShortTown = normTw(`${t.countyShort}${t.townName}`);
    const cShortBase = normTw(`${t.countyShort}${t.baseName}`);
    return (
      cleanCore === normTw(t.townName) ||
      cleanCore === normTw(t.baseName) ||
      combined === normTw(t.townName) ||
      combined === normTw(t.baseName) ||
      combined === normTw(t.fullCountyTown) ||
      cleanCore === normTw(t.fullCountyTown) ||
      cleanCore === cShortTown ||
      cleanCore === cShortBase
    );
  });

  if (matchedCasual.length > 0) {
    matchedCasual.forEach((t) => {
      state.unlockedTowns.add(t.id);
      state.unlockedCounties.add(t.countyName);
    });
    // If station overlay is active and this name also matches an active station (e.g. 板橋, 苗栗, 瑞芳), unlock that station too!
    let stationBonus = "";
    if (state.transportMode !== "off") {
      const activeStations = getActiveQuizStations();
      const cStripped = cleanStationBaseName(core);
      const bonusSt = activeStations.filter((st) => !state.unlockedStations.has(st.key) && st.baseName === cStripped);
      if (bonusSt.length > 0) {
        bonusSt.forEach((st) => state.unlockedStations.add(st.key));
        updateRoadAndRailwayTileOverlays();
        stationBonus = ` ＋ 🚉 車站「${bonusSt[0].displayName}」`;
      }
    }
    const labelStr =
      matchedCasual.length > 1
        ? `一次解鎖 ${matchedCasual.length} 個同名行政區：${matchedCasual.map((m) => m.fullCountyTown).join("、")}${stationBonus}`
        : `解鎖：${matchedCasual[0].fullCountyTown}${stationBonus}`;
    onSuccessfulUnlock(labelStr, matchedCasual[0].fullCountyTown, false);
    return true;
  }

  // Check if input matches any active Station (e.g. 內壢, 大橋頭, 十分, 內灣, 奮起湖, 美麗島, etc.)
  if (state.transportMode !== "off" && tryMatchAndUnlockStation(core, combined, isAutoCheck)) {
    return true;
  }

  if (!isAutoCheck) {
    triggerWrongFeedback(`找不到或已解鎖：「${combined}」`);
  }
  return false;
}

function onSuccessfulUnlock(msg, lastItemName, isTierOrTarget) {
  playTone(isTierOrTarget ? "tier" : "unlock");
  clearCoreInput();
  setFeedback(msg, "success");
  refreshAllPolygonStyles();
  updateScoreAndProgressUI();
  broadcastP2PState(lastItemName);
  checkVictoryCondition();
}

function triggerWrongFeedback(msg) {
  playTone("error");
  setFeedback(msg, "error");
  const card = document.getElementById("input-dock-card");
  if (card) {
    card.classList.remove("animate-shake");
    void card.offsetWidth;
    card.classList.add("animate-shake");
  }
}

function setFeedback(text, level = "info") {
  const el = document.getElementById("feedback-message");
  if (!el) return;
  const dotColors = {
    success: "bg-emerald-400",
    tier: "bg-amber-400",
    error: "bg-rose-500",
    warn: "bg-amber-400",
    info: "bg-sky-400"
  };
  const textColors = {
    success: "text-emerald-300",
    tier: "text-amber-300 font-bold",
    error: "text-rose-300",
    warn: "text-amber-200",
    info: "text-slate-300"
  };
  el.className = `${textColors[level] || "text-slate-300"} font-medium flex items-center gap-1.5 truncate`;
  el.innerHTML = `<span class="w-2 h-2 rounded-full shrink-0 ${dotColors[level] || "bg-sky-400"}"></span><span class="truncate">${text}</span>`;
}

// =========================================================================
// 7. TARGET REGION MODE
// =========================================================================
function pickNextTargetRegion() {
  state.hintLevel = 0;
  const remainingStations = getActiveQuizStations().filter((s) => !state.unlockedStations.has(s.key));
  const scopeTowns = getScopeTowns();

  // If in Pure Station Mode (0 counties selected) OR all townships done while stations remain
  if ((scopeTowns.length === 0 || scopeTowns.every((t) => state.unlockedTowns.has(t.id))) && remainingStations.length > 0) {
    const pickSt = remainingStations[Math.floor(Math.random() * remainingStations.length)];
    state.targetId = null;
    state.targetStationKey = pickSt.key;
    state.lastTargetLat = pickSt.lat;
    state.lastTargetLng = pickSt.lng;
    focusMapOnLatLng(pickSt.lat, pickSt.lng, 12);
    updateRoadAndRailwayTileOverlays();
    updateTargetBannerUI();
    refreshAllPolygonStyles();
    return;
  }

  state.targetStationKey = null;
  if (state.difficulty === "county_only") {
    const remaining = getScopeCounties().filter((c) => !state.unlockedCounties.has(c.name));
    if (remaining.length === 0) {
      state.targetId = null;
      checkVictoryCondition();
      return;
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    state.targetId = pick.name;
    state.lastTargetLat = pick.lat;
    state.lastTargetLng = pick.lng;
    focusMapOnLatLng(pick.lat, pick.lng, 9);
  } else {
    const remaining = scopeTowns.filter((t) => !state.unlockedTowns.has(t.id));
    if (remaining.length === 0) {
      state.targetId = null;
      checkVictoryCondition();
      return;
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    state.targetId = pick.id;
    state.lastTargetLat = pick.lat;
    state.lastTargetLng = pick.lng;
    focusMapOnLatLng(pick.lat, pick.lng, 10);
  }
  updateTargetBannerUI();
  refreshAllPolygonStyles();
}

// Move target selection to the nearest locked neighbor in direction ('N' | 'S' | 'W' | 'E')
function moveTargetByDirection(dir) {
  if (state.playMode === "free") {
    setPlayMode("target_click");
  }
  let curLat = state.lastTargetLat;
  let curLng = state.lastTargetLng;

  if (state.targetId) {
    if (state.difficulty === "county_only") {
      const c = COUNTY_BY_NAME[state.targetId];
      if (c) { curLat = c.lat; curLng = c.lng; }
    } else {
      const t = ALL_TOWNS.find((x) => x.id === state.targetId);
      if (t) { curLat = t.lat; curLng = t.lng; }
    }
  }

  const candidates = state.difficulty === "county_only"
    ? getScopeCounties().filter((c) => !state.unlockedCounties.has(c.name) && c.name !== state.targetId)
    : getScopeTowns().filter((t) => !state.unlockedTowns.has(t.id) && t.id !== state.targetId);

  if (candidates.length === 0) return;

  // Filter candidates in the requested half-plane and score by distance + directional alignment
  let best = null;
  let bestScore = Infinity;

  candidates.forEach((item) => {
    const dLat = item.lat - curLat;
    const dLng = item.lng - curLng;
    const dist = Math.hypot(dLat, dLng);
    if (dist < 1e-6) return;

    let primary = 0;
    let perp = 0;
    if (dir === "N") { primary = dLat; perp = Math.abs(dLng); }
    else if (dir === "S") { primary = -dLat; perp = Math.abs(dLng); }
    else if (dir === "E") { primary = dLng; perp = Math.abs(dLat); }
    else if (dir === "W") { primary = -dLng; perp = Math.abs(dLat); }

    if (primary <= 0) return; // Must be in the chosen direction

    // Score favors close neighbors that align well with the arrow direction
    const score = dist + perp * 1.35;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  });

  // Fallback if edge of island reached: pick closest in that general axis or wrap
  if (!best) return;

  state.hintLevel = 0;
  state.targetId = state.difficulty === "county_only" ? best.name : best.id;
  state.lastTargetLat = best.lat;
  state.lastTargetLng = best.lng;
  updateTargetBannerUI();
  refreshAllPolygonStyles();
  if (map) {
    map.panTo([best.lat, best.lng], { animate: true, duration: 0.35 });
  }
  document.getElementById("answer-input").focus();
}

function handlePolygonClick(townObj) {
  if (!isTownInScope(townObj)) return;

  if (state.playMode === "target_click" || state.playMode === "target_random") {
    if (state.difficulty === "county_only") {
      if (state.unlockedCounties.has(townObj.countyName)) {
        setFeedback(`「${townObj.countyName}」已經解鎖囉！`, "info");
        return;
      }
      state.targetId = townObj.countyName;
    } else {
      if (state.unlockedTowns.has(townObj.id)) {
        setFeedback(`已解鎖區塊：${townObj.fullHierarchyName}`, "info");
        return;
      }
      state.targetId = townObj.id;
    }
    state.lastTargetLat = townObj.lat;
    state.lastTargetLng = townObj.lng;
    state.hintLevel = 0;
    updateTargetBannerUI();
    refreshAllPolygonStyles();
    document.getElementById("answer-input").focus();
    return;
  }

  if (state.unlockedTowns.has(townObj.id)) {
    setFeedback(`📍 ${townObj.fullHierarchyName}`, "info");
  } else if (isCountyRevealed(townObj.countyName)) {
    const prefixVal =
      state.difficulty === "master_hierarchy"
        ? townObj.isSpecial
          ? townObj.countyName
          : `${townObj.province}${townObj.countyName}`
        : townObj.countyName;
    const select = document.getElementById("prefix-select");
    if (select && state.difficulty !== "county_only") {
      select.value = prefixVal;
      updateLiveCombinedPreview();
      setFeedback(`已將前綴鎖定為「${prefixVal}」，請輸入該區名稱！`, "info");
      document.getElementById("answer-input").focus();
    }
  } else {
    setFeedback(`🔒 尚未解鎖此區塊（位於未解鎖縣市內，猜中後自動揭曉）`, "info");
  }
}

function focusMapOnLatLng(lat, lng, minZ = 10) {
  if (!map) return;
  map.flyTo([lat, lng], Math.max(map.getZoom(), minZ), { duration: 0.5 });
}

function updateTargetBannerUI() {
  const banner = document.getElementById("target-quiz-banner");
  const titleEl = document.getElementById("target-banner-title");
  const descEl = document.getElementById("target-banner-desc");
  const hintBadge = document.getElementById("target-hint-badge");
  if (!banner) return;

  if (state.playMode === "free" && !state.targetStationKey) {
    banner.classList.add("hidden");
    return;
  }
  banner.classList.remove("hidden");

  if (state.targetStationKey) {
    const targetSt = getActiveQuizStations().find((s) => s.key === state.targetStationKey);
    if (targetSt) {
      titleEl.textContent = "🚉 指定車站作答";
      hintBadge.textContent = targetSt.lineName;
      descEl.textContent = "請輸入高亮閃爍圓點的「車站名稱」（免加站字亦可）";
      return;
    }
  }

  const isRandom = state.playMode === "target_random";
  titleEl.textContent = isRandom ? "🎯 指定目標模式 · 隨機抽題" : "👆 指定目標模式 · 自選點選";

  const reqText =
    state.difficulty === "casual"
      ? "普通難度：只需輸入鄉鎮或車站名稱"
      : state.difficulty === "county_only"
      ? "縣市模式：請輸入高亮區塊所屬的縣市名稱"
      : state.difficulty === "hard_suffix"
      ? "進階後綴：請輸入正確「鄉鎮市區+後綴」（免縣市）"
      : "困難全名：請輸入完整「縣市+鄉鎮市區+後綴」";

  if (!state.targetId) {
    hintBadge.textContent = "等待點選目標";
    descEl.textContent = "請直接點擊地圖上任一未解鎖區塊或車站圓點進行作答！";
  } else {
    hintBadge.textContent = "琥珀色高亮區塊";
    descEl.textContent = reqText;
  }
}

function giveTargetHint() {
  if (state.targetStationKey) {
    const st = getActiveQuizStations().find((s) => s.key === state.targetStationKey);
    if (st) {
      state.hintLevel++;
      if (state.hintLevel === 1) {
        setFeedback(`💡 車站提示 1：所屬路線為「${st.lineName}」`, "warn");
      } else {
        setFeedback(`💡 車站提示 2：隸屬「${st.lineName}」，站名首字為「${st.displayName[0]}...」`, "warn");
      }
    }
    return;
  }
  if (!state.targetId) return;
  state.hintLevel++;
  if (state.difficulty === "county_only") {
    const c = COUNTY_BY_NAME[state.targetId];
    if (c) setFeedback(`💡 提示：位於「${c.province}」，首字為「${c.name[0]}...」`, "warn");
    return;
  }
  const t = ALL_TOWNS.find((x) => x.id === state.targetId);
  if (!t) return;
  if (state.hintLevel === 1) {
    setFeedback(`💡 提示 1：此區塊位於「${t.isSpecial ? t.countyName : t.province + t.countyName}」`, "warn");
  } else {
    setFeedback(`💡 提示 2：隸屬「${t.countyName}」，鄉鎮首字為「${t.townName[0]}...」`, "warn");
  }
}
