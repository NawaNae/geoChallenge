P# AGENTS.md — GeoMaster TW 專案架構與維護導覽

> **核心目標**：本專案已將原本單一巨型 HTML（6,920 行 / 348 KB）拆分為「靜態資料 (`data/`)」、「樣式 (`css/`)」、「功能引擎 (`js/`)」與「網頁骨幹 (`index.html`)」。
> AI 代理（Agents）在維護或擴充功能時，**請根據下方索引只讀取需要修改的目標檔案**，切勿一次讀取全部檔案，以節省 80%~90% 的 Token 消耗。

## 1. 本地執行與載入規範 (`file://` 相容)

- **免建置、免打包**：本專案採用原生 `<script src="...">` 依序載入（不使用 `<script type="module">`），因此：
  1. 可直接雙擊 `index.html`（透過 `file://` 協定）在瀏覽器本地執行，不會觸發 CORS 阻擋。
  2. 亦可透過 VS Code Live Server、`python -m http.server 8000` 或直接部署至 GitHub Pages 執行。
- **腳本載入順序**（定義於 `index.html` 底部，請勿任意調換順序）：
  1. `data/admin-data.js` ➔ 2. `data/transport-data.js` ➔ 3. `js/state.js` ➔ 4. `js/map-engine.js` ➔ 5. `js/transport-engine.js` ➔ 6. `js/label-engine.js` ➔ 7. `js/game-logic.js` ➔ 8. `js/dashboard-ui.js` ➔ 9. `js/p2p-engine.js` ➔ 10. `js/ui-controls.js`

## 2. 目錄結構與檔案職責總覽

| 檔案路徑 | 行數 (約) | 職責說明 | 關鍵全域變數 / 函式 |
| :--- | :--- | :--- | :--- |
| `index.html` | ~970 | 網頁 DOM 骨幹：頂部導覽列、地圖畫布容器、底部輸入 Dock、右側統計面板、5 個設定/對戰彈窗 (Modals) | `#leaflet-map`, `#answer-input`, `#prefix-select`, `#suffix-input`, `#modal-scope`, `#modal-transport`, `#modal-p2p` |
| `css/styles.css` | ~410 | 視覺樣式：Apple Glass 毛玻璃、效能模式 (`body.perf-lite`)、底圖濾鏡、車站圓點與發光動畫、引線標籤與手機虛擬鍵盤適配 | `.apple-glass`, `.tw-station-lbl`, `.map-region-label`, `.callout-leader-pill`, `#leaflet-map.z-low` |
| `data/admin-data.js` | ~165 | 台灣 22 縣市與 368 鄉鎮市區靜態清單、縣市代表色、新舊地名別名映射與台/臺正規化 | `TAIWAN_ADMIN_DATA`, `COUNTY_COLORS`, `TOWN_ALIASES`, `COUNTY_ALIASES`, `normTw()`, `ALL_TOWNS`, `COUNTY_BY_NAME`, `COUNTY_BY_CODE` |
| `data/transport-data.js` | ~805 | 全台交通路網與軌道車站清單（高鐵、台鐵、北桃中捷高捷、輕軌、纜車、林鐵、糖鐵）、OSM 路線名稱正規表示式與山海線彎道錨點 | `TAIWAN_SELECTABLE_LINES`, `LINE_NAME_MATCHERS`, `LINE_DISPLAY_META`, `INTER_STATION_CURVE_WAYPOINTS` |
| `js/state.js` | ~105 | 全域應用程式狀態物件 (`state`) 與 Web Audio 音效合成器 | `state`, `playTone()` |
| `js/map-engine.js` | ~555 | Leaflet Canvas 地圖初始化、GPU 縮放矩陣同步 (`zoomanim`)、手機鍵盤高度動態適配、Esri 底圖切換、TopoJSON 載入與行政區多邊形渲染 | `map`, `canvasRenderer`, `initMap()`, `setMapBaseLayer()`, `loadRealTaiwanTopoJSON()`, `rebuildMapLayers()`, `computePolygonStyle()`, `refreshAllPolygonStyles()` |
| `js/transport-engine.js` | ~820 | 鐵道與車站核心引擎：Overpass / 政府開放資料車站座標對齊、Catmull-Rom 軌道平滑曲線、路網與車站圓點渲染、車站猜題比對 | `initPrecisionRailAndStationEngine()`, `loadOsmExactRailwayVectors()`, `buildSmoothRailwaySpline()`, `getActiveQuizStations()`, `tryMatchAndUnlockStation()`, `updateRoadAndRailwayTileOverlays()` |
| `js/label-engine.js` | ~180 | 視窗裁切 (Viewport Culling) 與智慧防重疊外拉引線 (Leader Lines) 標籤渲染引擎 | `renderSmartLabelsAndLeaderLines()` |
| `js/game-logic.js` | ~895 | 答題判定與目標區塊模式：4 種難度規則、前後綴組合 (`buildCombinedInput`)、答題判定 (`evaluateGuess`)、目標抽選與方向鍵 (`↑↓←→`) 鄰近區塊導航 | `getScopeTowns()`, `getScopeCounties()`, `isCountyRevealed()`, `updatePrefixDropdownUI()`, `buildCombinedInput()`, `evaluateGuess()`, `pickNextTargetRegion()`, `moveTargetByDirection()`, `handlePolygonClick()`, `giveTargetHint()` |
| `js/dashboard-ui.js` | ~570 | 右側進度儀表板、多重軌道分類進度條、防暴雷縣市清單、勝利判定、放棄揭曉、重置遊戲與正/倒數計時器 | `updateScoreAndProgressUI()`, `renderQuickZoomCountyChips()`, `renderCountyProgressSidebar()`, `checkVictoryCondition()`, `giveUpAndReveal()`, `resetGame()`, `startTimer()`, `stopTimer()` |
| `js/p2p-engine.js` | ~545 | PeerJS WebRTC 雙人連線對戰、BroadcastChannel 同機雙開同步、圖層鎖定規則、3-2-1 同步倒數與 AI 虛擬對手陪練 | `initP2PEngine()`, `hostP2PRoom()`, `joinP2PRoom()`, `broadcastP2PState()`, `updateOpponentUI()`, `startSynchronizedP2PCountdown()`, `toggleAiRivalSimulation()` |
| `js/ui-controls.js` | ~920 | 所有 DOM 事件綁定、難度/模式切換、出題範圍與路網勾選彈窗、鍵盤快捷鍵、Windows 微軟注音 IME 防吃字處理與 `window.onload` 啟動入口 | `setDifficulty()`, `setPlayMode()`, `renderScopeModalGrid()`, `openUnlockedAndHelpModal()`, `bindAllUIEvents()` |

## 3. 常見維護任務快速定位指南 (Task Routing)

當使用者提出以下需求時，請直接打開對應檔案修改，**無須讀取其他檔案**：

1. **修正車站座標、新增/修改捷運或鐵道路線、調整鐵路山海彎道錨點**
   - 只讀寫：`data/transport-data.js`
   - 若涉及 OSM 幾何抓取或曲線插值演算法：再看 `js/transport-engine.js`
2. **修正鄉鎮市區名稱、舊地名別名（如頭份鎮➔頭份市）、縣市代表色**
   - 只讀寫：`data/admin-data.js`
3. **修改答題判定規則、難度邏輯（休閒/縣市/困難/宗師）、前後綴組合邏輯**
   - 只讀寫：`js/game-logic.js`
4. **解決輸入框吃字、微軟注音 IME 殘留、鍵盤方向鍵快捷鍵、彈窗按鈕事件**
   - 只讀寫：`js/ui-controls.js`
5. **調整地圖流暢度、底圖圖層、多邊形填色透明度、手機鍵盤彈出時的地圖高度**
   - 只讀寫：`js/map-engine.js` 與 `css/styles.css`
6. **調整地圖上行政區名稱字體大小、引線標籤重疊、縮小地圖時隱藏小區域標籤**
   - 只讀寫：`js/label-engine.js`
7. **修改計分板百分比、右側縣市與軌道進度清單、防暴雷隱藏規則、計時器**
   - 只讀寫：`js/dashboard-ui.js`
8. **修改雙人連線對戰 (P2P)、房間連結參數、對手進度條或 AI 對手速度**
   - 只讀寫：`js/p2p-engine.js`
9. **調整介面佈局、新增按鈕或彈窗 HTML 結構**
   - 只讀寫：`index.html` 與對應綁定事件的 `js/ui-controls.js`

## 4. Token 節省與開發守則

- 搭配 `.agents/skills/ponytail/SKILL.md`（精簡修改原則）與 `.agents/skills/rtk/SKILL.md`（終端機低噪輸出）：
  - 使用 `rg -n "函式或關鍵字" js/ data/` 快速定位行號，再用局部讀取工具檢視目標區段。
  - 修改完畢後，可用 `node --check js/<檔名>.js` 快速驗證語法，零建置成本。
