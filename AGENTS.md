# AGENTS.md — GeoMaster TW 專案架構與維護導覽

> **核心目標**：本專案將「靜態資料 (`data/`)」、「樣式 (`css/`)」、「功能引擎 (`js/`)」與「網頁視圖骨幹與 `<template>` 模板 (`index.html`)」完整分離（MVC 架構）。
> AI 代理（Agents）在維護或擴充功能時，**請根據下方索引只讀取需要修改的目標檔案**，切勿一次讀取全部檔案，以節省 80%~90% 的 Token 消耗。

## 1. 本地執行與載入規範 (`file://` 相容)

- **免建置、免打包**：本專案採用原生 `<script src="...">` 依序載入（不使用 `<script type="module">`），因此：
  1. 可直接雙擊 `index.html`（透過 `file://` 協定）在瀏覽器本地執行，不會觸發 CORS 阻擋；`css/styles.css` 亦內建離線 RWD 佈局與漸層按鈕樣式備援。
  2. 亦可透過 VS Code Live Server、`python3 -m http.server 8000` 或直接部署至 GitHub Pages 執行。
- **腳本載入順序**（定義於 `index.html` 底部，請勿任意調換順序）：
  1. `data/admin-data.js` ➔ 2. `data/railisland-shapes.js` ➔ 3. `data/transport-data.js` ➔ 4. `js/state.js` ➔ 5. `js/map-engine.js` ➔ 6. `js/transport-engine.js` ➔ 7. `js/label-engine.js` ➔ 8. `js/game-logic.js` ➔ 9. `js/dashboard-ui.js` ➔ 10. `js/p2p-engine.js` ➔ 11. `js/ui-controls.js`

## 2. 目錄結構與檔案職責總覽

| 檔案路徑 | 行數 (約) | 職責說明 | 關鍵全域變數 / 函式 |
| :--- | :--- | :--- | :--- |
| `index.html` | ~1,615 | 網頁 DOM 視圖骨幹、頂部單一「挑戰設定」入口按鈕 (`#btn-open-scope`)、單一捲軸挑戰與多人房間設定中心 (`#modal-scope` 內含 `#hub-scroll-body`、可展開/收合之多人房間區塊 `#p2p-room-accordion` / `#p2p-lobby-sidebar` 與共用題庫面板 `#unified-settings-panel`)、全體參賽者投票彈窗 (`#modal-config-vote`)、觀戰控制列 (`#spectator-mode-banner`) 與底部 11 個 `<template>` 視圖模板 | `#leaflet-map`, `#btn-open-scope`, `#modal-scope`, `#hub-scroll-body`, `#p2p-room-accordion`, `#p2p-lobby-sidebar`, `#unified-settings-panel`, `#modal-config-vote`, `#tpl-*` |
| `css/styles.css` | ~595 | 視覺樣式：Apple Glass 毛玻璃、效能模式 (`body.perf-lite`)、彈窗開啟時背景鎖定防滾動穿透 (`body.modal-open`, `.overscroll-contain`)、長螢幕與窄視窗 RWD 地圖高度自適應、車站圓點與引線標籤及離線佈局備援 | `.apple-glass`, `body.modal-open`, `.overscroll-contain`, `.tw-station-lbl`, `.map-region-label` |
| `data/admin-data.js` | ~165 | 台灣 22 縣市與 368 鄉鎮市區靜態清單、縣市代表色、新舊地名別名映射與台/臺正規化 | `TAIWAN_ADMIN_DATA`, `COUNTY_COLORS`, `TOWN_ALIASES`, `COUNTY_ALIASES`, `normTw()`, `ALL_TOWNS`, `COUNTY_BY_NAME`, `COUNTY_BY_CODE` |
| `data/transport-data.js` | ~805 | 全台交通路網與軌道車站清單（高鐵、台鐵、北桃中捷高捷、輕軌、纜車、林鐵、糖鐵）、OSM 路線名稱正規表示式與山海線彎道錨點 | `TAIWAN_SELECTABLE_LINES`, `LINE_NAME_MATCHERS`, `LINE_DISPLAY_META`, `INTER_STATION_CURVE_WAYPOINTS` |
| `data/railisland-shapes.js` | ~1 | 開放資料鐵道與捷運真實幾何線段 (`MultiLineString`) | `RAILISLAND_SHAPES`, `OPEN_RAIL_ATTRIBUTION` |
| `js/state.js` | ~266 | 全域狀態物件 (`state`，含 `p2pPanelExpanded` 房間面板展開狀態)、穩定裝置識別碼 (`getOrCreateStableDeviceId()`)、觀戰視角代理 (`getActiveViewState()`)、防作弊權限守衛 (`canLocalModifyGameConfig()`) 與音效合成器 | `state`, `getActiveViewState()`, `canLocalModifyGameConfig()`, `playTone()` |
| `js/map-engine.js` | ~550 | Leaflet Canvas 地圖初始化、GPU 縮放矩陣同步 (`zoomanim`)、Esri 底圖切換（觀戰者不受鎖定限制）、TopoJSON 載入與多邊形渲染（透過 `getActiveViewState()` 支援切換觀看任意選手地圖） | `map`, `canvasRenderer`, `initMap()`, `setMapBaseLayer()`, `computePolygonStyle()`, `refreshAllPolygonStyles()` |
| `js/transport-engine.js` | ~1,020 | 鐵道與車站核心引擎：真實軌道向量與車站圓點渲染（透過 `getActiveViewState()` 支援觀戰視角，觀戰者可自由切換路網不受 Ban 限制）、車站猜題比對 | `initPrecisionRailAndStationEngine()`, `getActiveQuizStations()`, `tryMatchAndUnlockStation()`, `updateRoadAndRailwayTileOverlays()` |
| `js/label-engine.js` | ~180 | 視窗裁切 (Viewport Culling) 與智慧防重疊外拉引線 (Leader Lines) 標籤渲染引擎（支援觀戰視角） | `renderSmartLabelsAndLeaderLines()` |
| `js/game-logic.js` | ~925 | 答題判定與目標區塊模式：5 種難度規則、前後綴組合 (`buildCombinedInput`)、答題判定 (`evaluateGuess`)、目標抽選與方向鍵 (`↑↓←→`) 鄰近區塊導航 | `getScopeTowns()`, `getScopeCounties()`, `isCountyRevealed()`, `updatePrefixDropdownUI()`, `evaluateGuess()`, `pickNextTargetRegion()` |
| `js/dashboard-ui.js` | ~1,130 | 右側進度儀表板、多重軌道分類進度條、防暴雷縣市清單、勝利判定、結算成績單與正/倒數計時器（全面採用 `<template>` 渲染並支援觀戰視角） | `updateScoreAndProgressUI()`, `renderQuickZoomCountyChips()`, `renderCountyProgressSidebar()`, `checkVictoryCondition()`, `resetGame()` |
| `js/p2p-engine.js` | ~2,665 | 多人連線對戰 (`>2` 人)、完整觀戰模式 (`setSpectatingTarget`)、雙邀請連結（觀戰連結/參賽連結，支援 `file://` 與 `http://`）、房間密碼、裝置 ID 斷線續連 (`saveActiveSessionToStorage`) 與房主變更難度全體參賽者同意投票狀態機 (`requestOrApplyConfigChange`) | `initP2PEngine()`, `hostP2PRoom()`, `joinP2PRoom()`, `setSpectatingTarget()`, `requestOrApplyConfigChange()`, `broadcastP2PState()` |
| `js/ui-controls.js` | ~1,430 | 統一挑戰設定與可展開多人房間控制器 (`openGameHubModal`, `toggleP2PRoomPanel`, `syncP2PRoomAccordionUI`)、彈窗背景防滾動穿透鎖定 (`syncModalBodyScrollLock`)、共用路線清單渲染器 (`renderLineChecklistView`)、DOM 事件綁定與 Windows 微軟注音 IME 防吃字處理 | `setDifficulty()`, `setPlayMode()`, `openGameHubModal()`, `toggleP2PRoomPanel()`, `syncModalBodyScrollLock()`, `renderScopeModalGrid()`, `bindAllUIEvents()` |
