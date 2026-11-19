// ================================================================
// TAIWAN POI DATA (Airports & Ports — Modular & Deduplicated)
// ================================================================
// Design notes:
// - Each POI item carries `subTypes: [...]` so overlapping classifications
//   (e.g. joint-use civil/military airports, or dual industrial/petro ports)
//   increment each sub-category's badge count by +1 while counting only +1
//   in the deduplicated total quiz pool.
// - Every `countyName` + `townName` matches `ALL_TOWNS` in `data/admin-data.js`
//   so regional filtering works cleanly without coordinate drift.

const POI_CATEGORY_META = {
  airport: {
    id: "airport",
    label: "機場",
    icon: "✈️",
    accent: "#38bdf8",
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-400/40"
  },
  port: {
    id: "port",
    label: "港口",
    icon: "⚓",
    accent: "#2dd4bf",
    badgeClass: "bg-teal-500/20 text-teal-300 border-teal-400/40"
  }
};

const AIRPORT_SUBTYPES = [
  { id: "intl", label: "國際機場", shortLabel: "國際", icon: "🌐", tier: "simple", isDefault: true },
  { id: "domestic", label: "國內機場", shortLabel: "國內", icon: "🏠", tier: "simple", isDefault: true },
  { id: "military", label: "軍機場", shortLabel: "軍用", icon: "🎖️", tier: "simple", isDefault: true }
];

const PORT_SUBTYPES = [
  // Default / Simple selectable
  { id: "intl_commercial", label: "國際商港", shortLabel: "國際商港", icon: "🚢", tier: "simple", isDefault: true },
  { id: "intl_aux", label: "國際輔助港", shortLabel: "國際輔助港", icon: "⚓", tier: "simple", isDefault: true },
  { id: "fishery_cat1", label: "第一類漁港(大)", shortLabel: "一類漁港", icon: "🐟", tier: "simple", isDefault: true },
  // Advanced selectable (default OFF)
  { id: "fishery_cat2", label: "第二類漁港(小)", shortLabel: "二類漁港", icon: "🎣", tier: "advanced", isDefault: false },
  { id: "industrial", label: "工業港", shortLabel: "工業港", icon: "🏭", tier: "advanced", isDefault: false },
  { id: "petro_lng", label: "石化天然氣港", shortLabel: "石化天然氣", icon: "⛽", tier: "advanced", isDefault: false }
];

const TAIWAN_POI_DATA = [
  // ----------------------------------------------------------------
  // ✈️ AIRPORTS (24 unique: 4 intl, 16 domestic, 15 military)
  // ----------------------------------------------------------------
  {
    id: "ap_tpe",
    category: "airport",
    name: "臺灣桃園國際機場",
    shortName: "桃園機場",
    code: "TPE",
    aliases: ["桃園國際機場", "台灣桃園國際機場", "桃園機場", "桃機", "中正國際機場", "中正機場", "TPE", "RCTP"],
    subTypes: ["intl"],
    countyName: "桃園市",
    townName: "大園區",
    lat: 25.0777,
    lng: 121.2328,
    note: "國際樞紐機場"
  },
  {
    id: "ap_tsa",
    category: "airport",
    name: "臺北松山機場",
    shortName: "松山機場",
    code: "TSA",
    aliases: ["台北松山機場", "臺北國際機場", "台北國際機場", "松山機場", "空軍松山基地", "松山基地", "松機", "TSA", "RCSS"],
    subTypes: ["intl", "domestic", "military"],
    countyName: "臺北市",
    townName: "松山區",
    lat: 25.0694,
    lng: 121.5525,
    note: "國際/國內/軍民合用"
  },
  {
    id: "ap_rmq",
    category: "airport",
    name: "臺中國際機場",
    shortName: "臺中機場",
    code: "RMQ",
    aliases: ["台中國際機場", "台中機場", "臺中機場", "清泉崗機場", "清泉崗基地", "空軍清泉崗基地", "清泉崗", "RMQ", "RCMQ"],
    subTypes: ["intl", "domestic", "military"],
    countyName: "臺中市",
    townName: "沙鹿區",
    lat: 24.2647,
    lng: 120.6206,
    note: "國際/國內/軍民合用（清泉崗）"
  },
  {
    id: "ap_khh",
    category: "airport",
    name: "高雄國際機場",
    shortName: "高雄機場",
    code: "KHH",
    aliases: ["高雄機場", "小港機場", "高雄小港機場", "小港國際機場", "KHH", "RCKH"],
    subTypes: ["intl", "domestic"],
    countyName: "高雄市",
    townName: "小港區",
    lat: 22.5771,
    lng: 120.3500,
    note: "國際/國內機場（小港）"
  },
  {
    id: "ap_hun",
    category: "airport",
    name: "花蓮機場",
    shortName: "花蓮機場",
    code: "HUN",
    aliases: ["花蓮航空站", "空軍花蓮基地", "花蓮基地", "HUN", "RCYU"],
    subTypes: ["domestic", "military"],
    countyName: "花蓮縣",
    townName: "新城鄉",
    lat: 24.0231,
    lng: 121.6178,
    note: "國內/軍民合用"
  },
  {
    id: "ap_ttt",
    category: "airport",
    name: "臺東機場",
    shortName: "臺東機場",
    code: "TTT",
    aliases: ["台東機場", "豐年機場", "臺東豐年機場", "台東豐年機場", "臺東航空站", "TTT", "RCFN"],
    subTypes: ["domestic"],
    countyName: "臺東縣",
    townName: "臺東市",
    lat: 22.7550,
    lng: 121.1017,
    note: "國內機場（豐年）"
  },
  {
    id: "ap_tnn",
    category: "airport",
    name: "臺南機場",
    shortName: "臺南機場",
    code: "TNN",
    aliases: ["台南機場", "臺南航空站", "台南航空站", "空軍臺南基地", "空軍台南基地", "臺南基地", "台南基地", "TNN", "RCNN"],
    subTypes: ["domestic", "military"],
    countyName: "臺南市",
    townName: "南區",
    lat: 22.9504,
    lng: 120.2058,
    note: "國內/軍民合用"
  },
  {
    id: "ap_cyi",
    category: "airport",
    name: "嘉義機場",
    shortName: "嘉義機場",
    code: "CYI",
    aliases: ["水上機場", "嘉義水上機場", "嘉義航空站", "空軍嘉義基地", "嘉義基地", "CYI", "RCKU"],
    subTypes: ["domestic", "military"],
    countyName: "嘉義縣",
    townName: "水上鄉",
    lat: 23.4618,
    lng: 120.3928,
    note: "國內/軍民合用（水上）"
  },
  {
    id: "ap_mzg",
    category: "airport",
    name: "澎湖機場",
    shortName: "澎湖機場",
    code: "MZG",
    aliases: ["馬公機場", "澎湖馬公機場", "澎湖航空站", "空軍馬公基地", "馬公基地", "MZG", "RCQC"],
    subTypes: ["domestic", "military"],
    countyName: "澎湖縣",
    townName: "湖西鄉",
    lat: 23.5687,
    lng: 119.6283,
    note: "國內/軍民合用（馬公）"
  },
  {
    id: "ap_knh",
    category: "airport",
    name: "金門機場",
    shortName: "金門機場",
    code: "KNH",
    aliases: ["尚義機場", "金門尚義機場", "金門航空站", "空軍金門基地", "KNH", "RCBS"],
    subTypes: ["domestic", "military"],
    countyName: "金門縣",
    townName: "金湖鎮",
    lat: 24.4279,
    lng: 118.3592,
    note: "國內/軍民合用（尚義）"
  },
  {
    id: "ap_lzn",
    category: "airport",
    name: "馬祖南竿機場",
    shortName: "南竿機場",
    code: "LZN",
    aliases: ["南竿機場", "馬祖南竿航空站", "LZN", "RCFG"],
    subTypes: ["domestic"],
    countyName: "連江縣",
    townName: "南竿鄉",
    lat: 26.1598,
    lng: 119.9583,
    note: "國內離島機場"
  },
  {
    id: "ap_mfk",
    category: "airport",
    name: "馬祖北竿機場",
    shortName: "北竿機場",
    code: "MFK",
    aliases: ["北竿機場", "馬祖北竿航空站", "MFK", "RCMT"],
    subTypes: ["domestic"],
    countyName: "連江縣",
    townName: "北竿鄉",
    lat: 26.2242,
    lng: 120.0028,
    note: "國內離島機場"
  },
  {
    id: "ap_cmj",
    category: "airport",
    name: "七美機場",
    shortName: "七美機場",
    code: "CMJ",
    aliases: ["七美航空站", "澎湖七美機場", "CMJ", "RCCM"],
    subTypes: ["domestic"],
    countyName: "澎湖縣",
    townName: "七美鄉",
    lat: 23.2131,
    lng: 119.4181,
    note: "國內離島機場"
  },
  {
    id: "ap_wot",
    category: "airport",
    name: "望安機場",
    shortName: "望安機場",
    code: "WOT",
    aliases: ["望安航空站", "澎湖望安機場", "WOT", "RCWA"],
    subTypes: ["domestic"],
    countyName: "澎湖縣",
    townName: "望安鄉",
    lat: 23.3686,
    lng: 119.5019,
    note: "國內離島機場"
  },
  {
    id: "ap_gni",
    category: "airport",
    name: "綠島機場",
    shortName: "綠島機場",
    code: "GNI",
    aliases: ["綠島航空站", "GNI", "RCGI"],
    subTypes: ["domestic"],
    countyName: "臺東縣",
    townName: "綠島鄉",
    lat: 22.6739,
    lng: 121.4667,
    note: "國內離島機場"
  },
  {
    id: "ap_kyd",
    category: "airport",
    name: "蘭嶼機場",
    shortName: "蘭嶼機場",
    code: "KYD",
    aliases: ["蘭嶼航空站", "KYD", "RCLY"],
    subTypes: ["domestic"],
    countyName: "臺東縣",
    townName: "蘭嶼鄉",
    lat: 22.0270,
    lng: 121.5349,
    note: "國內離島機場"
  },
  {
    id: "ap_hcn",
    category: "airport",
    name: "恆春機場",
    shortName: "恆春機場",
    code: "HCN",
    aliases: ["五里亭機場", "恆春五里亭機場", "恆春航空站", "HCN", "RCKW"],
    subTypes: ["domestic", "military"],
    countyName: "屏東縣",
    townName: "恆春鎮",
    lat: 22.0411,
    lng: 120.7303,
    note: "國內/軍民合用（五里亭）"
  },
  // Pure Military Air Bases
  {
    id: "ap_rcpo",
    category: "airport",
    name: "新竹空軍基地",
    shortName: "新竹基地",
    code: "RCPO",
    aliases: ["新竹機場", "空軍新竹基地", "新竹軍機場", "RCPO"],
    subTypes: ["military"],
    countyName: "新竹市",
    townName: "北區",
    lat: 24.8181,
    lng: 120.9394,
    note: "空軍基地"
  },
  {
    id: "ap_rcay",
    category: "airport",
    name: "岡山空軍基地",
    shortName: "岡山基地",
    code: "RCAY",
    aliases: ["岡山機場", "空軍岡山基地", "空軍官校機場", "岡山軍機場", "RCAY"],
    subTypes: ["military"],
    countyName: "高雄市",
    townName: "岡山區",
    lat: 22.7826,
    lng: 120.2633,
    note: "空軍官校基地"
  },
  {
    id: "ap_rcsq",
    category: "airport",
    name: "屏東空軍基地",
    shortName: "屏東基地",
    code: "RCSQ",
    aliases: ["屏東機場", "空軍屏東基地", "屏南機場", "屏北機場", "屏東軍機場", "PIF", "RCSQ"],
    subTypes: ["military"],
    countyName: "屏東縣",
    townName: "屏東市",
    lat: 22.6724,
    lng: 120.4617,
    note: "空軍基地（屏南/屏北）"
  },
  {
    id: "ap_rcqs",
    category: "airport",
    name: "志航基地",
    shortName: "志航基地",
    code: "RCQS",
    aliases: ["空軍志航基地", "臺東志航基地", "台東志航基地", "志航機場", "RCQS"],
    subTypes: ["military"],
    countyName: "臺東縣",
    townName: "臺東市",
    lat: 22.7931,
    lng: 121.1819,
    note: "空軍臺東基地"
  },
  {
    id: "ap_jiashan",
    category: "airport",
    name: "佳山基地",
    shortName: "佳山基地",
    code: "",
    aliases: ["空軍佳山基地", "花蓮佳山基地", "佳山機場", "佳山洞庫"],
    subTypes: ["military"],
    countyName: "花蓮縣",
    townName: "新城鄉",
    lat: 24.0278,
    lng: 121.5925,
    note: "空軍戰備基地"
  },
  {
    id: "ap_rcdi",
    category: "airport",
    name: "龍潭陸軍航空基地",
    shortName: "龍潭基地",
    code: "RCDI",
    aliases: ["龍潭基地", "龍潭機場", "陸航龍潭基地", "龍城營區", "RCDI"],
    subTypes: ["military"],
    countyName: "桃園市",
    townName: "龍潭區",
    lat: 24.8551,
    lng: 121.2375,
    note: "陸軍航空基地"
  },
  {
    id: "ap_rcuk",
    category: "airport",
    name: "歸仁陸軍航空基地",
    shortName: "歸仁基地",
    code: "RCUK",
    aliases: ["歸仁基地", "歸仁機場", "陸航歸仁基地", "歸仁輕航基地", "RCUK"],
    subTypes: ["military"],
    countyName: "臺南市",
    townName: "歸仁區",
    lat: 22.9756,
    lng: 120.2892,
    note: "陸軍航空基地"
  },

  // ----------------------------------------------------------------
  // ⚓ PORTS — Default Selectable:
  //   1. 國際商港 (4)
  //   2. 國際輔助港 (3, excluding petro/industrial)
  //   3. 第一類漁港(大) (9)
  // ----------------------------------------------------------------
  {
    id: "pt_keelung",
    category: "port",
    name: "基隆港",
    shortName: "基隆港",
    aliases: ["基隆國際商港", "基隆商港"],
    subTypes: ["intl_commercial"],
    countyName: "基隆市",
    townName: "仁愛區",
    lat: 25.1346,
    lng: 121.7419,
    note: "國際商港"
  },
  {
    id: "pt_taichung",
    category: "port",
    name: "臺中港",
    shortName: "臺中港",
    aliases: ["台中港", "臺中國際商港", "台中國際商港", "台中商港"],
    subTypes: ["intl_commercial"],
    countyName: "臺中市",
    townName: "梧棲區",
    lat: 24.2874,
    lng: 120.5173,
    note: "國際商港"
  },
  {
    id: "pt_kaohsiung",
    category: "port",
    name: "高雄港",
    shortName: "高雄港",
    aliases: ["高雄國際商港", "高雄商港"],
    subTypes: ["intl_commercial"],
    countyName: "高雄市",
    townName: "鼓山區",
    lat: 22.6152,
    lng: 120.2797,
    note: "國際商港"
  },
  {
    id: "pt_hualien",
    category: "port",
    name: "花蓮港",
    shortName: "花蓮港",
    aliases: ["花蓮國際商港", "花蓮商港"],
    subTypes: ["intl_commercial"],
    countyName: "花蓮縣",
    townName: "花蓮市",
    lat: 23.9888,
    lng: 121.6272,
    note: "國際商港"
  },
  // 國際輔助港 (石化天然氣、工業去除)
  {
    id: "pt_taipei",
    category: "port",
    name: "臺北港",
    shortName: "臺北港",
    aliases: ["台北港", "臺北國際商港", "台北國際商港", "八里港"],
    subTypes: ["intl_aux"],
    countyName: "新北市",
    townName: "八里區",
    lat: 25.1544,
    lng: 121.3847,
    note: "國際商港輔助港（基隆輔助）"
  },
  {
    id: "pt_suao",
    category: "port",
    name: "蘇澳港",
    shortName: "蘇澳港",
    aliases: ["蘇澳國際商港", "蘇澳商港"],
    subTypes: ["intl_aux"],
    countyName: "宜蘭縣",
    townName: "蘇澳鎮",
    lat: 24.5944,
    lng: 121.8622,
    note: "國際商港輔助港（基隆輔助）"
  },
  {
    id: "pt_anping",
    category: "port",
    name: "安平港",
    shortName: "安平港",
    aliases: ["安平商港", "安平國際商港", "安平新港"],
    subTypes: ["intl_aux"],
    countyName: "臺南市",
    townName: "南區",
    lat: 22.9748,
    lng: 120.1492,
    note: "國際商港輔助港（高雄輔助）"
  },
  // 第一類漁港(大) — 官方 9 座
  {
    id: "pt_zhengbin",
    category: "port",
    name: "正濱漁港",
    shortName: "正濱漁港",
    aliases: ["正濱港", "基隆正濱漁港"],
    subTypes: ["fishery_cat1"],
    countyName: "基隆市",
    townName: "中正區",
    lat: 25.1526,
    lng: 121.7695,
    note: "第一類漁港"
  },
  {
    id: "pt_badouzi",
    category: "port",
    name: "八斗子漁港",
    shortName: "八斗子漁港",
    aliases: ["八斗子港", "碧砂漁港"],
    subTypes: ["fishery_cat1"],
    countyName: "基隆市",
    townName: "中正區",
    lat: 25.1449,
    lng: 121.7915,
    note: "第一類漁港"
  },
  {
    id: "pt_wushi",
    category: "port",
    name: "烏石漁港",
    shortName: "烏石漁港",
    aliases: ["烏石港", "頭城烏石港"],
    subTypes: ["fishery_cat1"],
    countyName: "宜蘭縣",
    townName: "頭城鎮",
    lat: 24.8693,
    lng: 121.8384,
    note: "第一類漁港"
  },
  {
    id: "pt_nanfangao",
    category: "port",
    name: "南方澳漁港",
    shortName: "南方澳漁港",
    aliases: ["南方澳港", "南方澳"],
    subTypes: ["fishery_cat1"],
    countyName: "宜蘭縣",
    townName: "蘇澳鎮",
    lat: 24.5825,
    lng: 121.8691,
    note: "第一類漁港"
  },
  {
    id: "pt_hsinchu_fish",
    category: "port",
    name: "新竹漁港",
    shortName: "新竹漁港",
    aliases: ["南寮漁港", "南寮港", "新竹南寮漁港"],
    subTypes: ["fishery_cat1"],
    countyName: "新竹市",
    townName: "北區",
    lat: 24.8495,
    lng: 120.9234,
    note: "第一類漁港（南寮）"
  },
  {
    id: "pt_wuqi",
    category: "port",
    name: "梧棲漁港",
    shortName: "梧棲漁港",
    aliases: ["梧棲觀光漁港", "梧棲港"],
    subTypes: ["fishery_cat1"],
    countyName: "臺中市",
    townName: "清水區",
    lat: 24.2932,
    lng: 120.5204,
    note: "第一類漁港"
  },
  {
    id: "pt_anping_fish",
    category: "port",
    name: "安平漁港",
    shortName: "安平漁港",
    aliases: ["臺南安平漁港", "台南安平漁港"],
    subTypes: ["fishery_cat1"],
    countyName: "臺南市",
    townName: "安平區",
    lat: 22.9939,
    lng: 120.1539,
    note: "第一類漁港"
  },
  {
    id: "pt_qianzhen",
    category: "port",
    name: "前鎮漁港",
    shortName: "前鎮漁港",
    aliases: ["高雄前鎮漁港", "前鎮港"],
    subTypes: ["fishery_cat1"],
    countyName: "高雄市",
    townName: "前鎮區",
    lat: 22.5706,
    lng: 120.3125,
    note: "第一類漁港"
  },
  {
    id: "pt_donggang",
    category: "port",
    name: "東港鹽埔漁港",
    shortName: "東港鹽埔漁港",
    aliases: ["東港漁港", "鹽埔漁港", "東港港"],
    subTypes: ["fishery_cat1"],
    countyName: "屏東縣",
    townName: "東港鎮",
    lat: 22.4673,
    lng: 120.4408,
    note: "第一類漁港"
  },

  // ----------------------------------------------------------------
  // ⚓ PORTS — Advanced Selectable:
  //   4. 第二類漁港(小) (24 代表性知名漁港)
  //   5. 工業港 (2)
  //   6. 石化天然氣港 (4, 麥寮雙標籤去重)
  // ----------------------------------------------------------------
  {
    id: "pt_tamsui2",
    category: "port",
    name: "淡水第二漁港",
    shortName: "淡水漁人碼頭",
    aliases: ["淡水漁人碼頭", "漁人碼頭", "淡水漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "新北市",
    townName: "淡水區",
    lat: 25.1833,
    lng: 121.4106,
    note: "第二類漁港（漁人碼頭）"
  },
  {
    id: "pt_fuji",
    category: "port",
    name: "富基漁港",
    shortName: "富基漁港",
    aliases: ["富基港"],
    subTypes: ["fishery_cat2"],
    countyName: "新北市",
    townName: "石門區",
    lat: 25.2934,
    lng: 121.5356,
    note: "第二類漁港"
  },
  {
    id: "pt_yehliu",
    category: "port",
    name: "野柳漁港",
    shortName: "野柳漁港",
    aliases: ["野柳港"],
    subTypes: ["fishery_cat2"],
    countyName: "新北市",
    townName: "萬里區",
    lat: 25.2055,
    lng: 121.6901,
    note: "第二類漁港"
  },
  {
    id: "pt_guihou",
    category: "port",
    name: "龜吼漁港",
    shortName: "龜吼漁港",
    aliases: ["龜吼港"],
    subTypes: ["fishery_cat2"],
    countyName: "新北市",
    townName: "萬里區",
    lat: 25.1950,
    lng: 121.6881,
    note: "第二類漁港"
  },
  {
    id: "pt_shenao",
    category: "port",
    name: "深澳漁港",
    shortName: "深澳漁港",
    aliases: ["深澳港", "番仔澳漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "新北市",
    townName: "瑞芳區",
    lat: 25.1319,
    lng: 121.8194,
    note: "第二類漁港"
  },
  {
    id: "pt_zhuwei",
    category: "port",
    name: "竹圍漁港",
    shortName: "竹圍漁港",
    aliases: ["竹圍港"],
    subTypes: ["fishery_cat2"],
    countyName: "桃園市",
    townName: "大園區",
    lat: 25.1157,
    lng: 121.2442,
    note: "第二類漁港"
  },
  {
    id: "pt_yongan_fish",
    category: "port",
    name: "永安漁港",
    shortName: "永安漁港",
    aliases: ["桃園永安漁港", "新屋永安漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "桃園市",
    townName: "新屋區",
    lat: 24.9854,
    lng: 121.0169,
    note: "第二類漁港"
  },
  {
    id: "pt_waipu",
    category: "port",
    name: "外埔漁港",
    shortName: "外埔漁港",
    aliases: ["外埔港", "後龍外埔漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "苗栗縣",
    townName: "後龍鎮",
    lat: 24.6512,
    lng: 120.7712,
    note: "第二類漁港"
  },
  {
    id: "pt_wanggong",
    category: "port",
    name: "王功漁港",
    shortName: "王功漁港",
    aliases: ["王功港"],
    subTypes: ["fishery_cat2"],
    countyName: "彰化縣",
    townName: "芳苑鄉",
    lat: 23.9675,
    lng: 120.3248,
    note: "第二類漁港"
  },
  {
    id: "pt_boziliao",
    category: "port",
    name: "箔子寮漁港",
    shortName: "箔子寮漁港",
    aliases: ["箔子寮港", "萡子寮漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "雲林縣",
    townName: "口湖鄉",
    lat: 23.6111,
    lng: 120.1369,
    note: "第二類漁港"
  },
  {
    id: "pt_dongshi",
    category: "port",
    name: "東石漁港",
    shortName: "東石漁港",
    aliases: ["東石港", "東石漁人碼頭"],
    subTypes: ["fishery_cat2"],
    countyName: "嘉義縣",
    townName: "東石鄉",
    lat: 23.4508,
    lng: 120.1384,
    note: "第二類漁港"
  },
  {
    id: "pt_budai_fish",
    category: "port",
    name: "布袋漁港",
    shortName: "布袋漁港",
    aliases: ["布袋港", "布袋觀光漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "嘉義縣",
    townName: "布袋鎮",
    lat: 23.3792,
    lng: 120.1511,
    note: "第二類漁港"
  },
  {
    id: "pt_jiangjun",
    category: "port",
    name: "將軍漁港",
    shortName: "將軍漁港",
    aliases: ["將軍港"],
    subTypes: ["fishery_cat2"],
    countyName: "臺南市",
    townName: "將軍區",
    lat: 23.2134,
    lng: 120.0837,
    note: "第二類漁港"
  },
  {
    id: "pt_xingda",
    category: "port",
    name: "興達漁港",
    shortName: "興達漁港",
    aliases: ["興達港"],
    subTypes: ["fishery_cat2"],
    countyName: "高雄市",
    townName: "茄萣區",
    lat: 22.8726,
    lng: 120.1932,
    note: "第二類漁港"
  },
  {
    id: "pt_keziliao",
    category: "port",
    name: "蚵仔寮漁港",
    shortName: "蚵仔寮漁港",
    aliases: ["蚵仔寮港", "蚵子寮漁港", "梓官蚵仔寮漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "高雄市",
    townName: "梓官區",
    lat: 22.7253,
    lng: 120.2529,
    note: "第二類漁港"
  },
  {
    id: "pt_fangliao",
    category: "port",
    name: "枋寮漁港",
    shortName: "枋寮漁港",
    aliases: ["枋寮港"],
    subTypes: ["fishery_cat2"],
    countyName: "屏東縣",
    townName: "枋寮鄉",
    lat: 22.3647,
    lng: 120.5916,
    note: "第二類漁港"
  },
  {
    id: "pt_houbihu",
    category: "port",
    name: "後壁湖漁港",
    shortName: "後壁湖漁港",
    aliases: ["後壁湖港", "後壁湖"],
    subTypes: ["fishery_cat2"],
    countyName: "屏東縣",
    townName: "恆春鎮",
    lat: 21.9447,
    lng: 120.7448,
    note: "第二類漁港"
  },
  {
    id: "pt_fugang",
    category: "port",
    name: "富岡漁港",
    shortName: "富岡漁港",
    aliases: ["富岡港", "伽藍漁港", "臺東富岡漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "臺東縣",
    townName: "臺東市",
    lat: 22.7918,
    lng: 121.1938,
    note: "第二類漁港（往綠島/蘭嶼）"
  },
  {
    id: "pt_chenggong",
    category: "port",
    name: "成功漁港",
    shortName: "成功漁港",
    aliases: ["新港漁港", "成功新港", "成功港"],
    subTypes: ["fishery_cat2"],
    countyName: "臺東縣",
    townName: "成功鎮",
    lat: 23.0977,
    lng: 121.3792,
    note: "第二類漁港（新港）"
  },
  {
    id: "pt_shiti",
    category: "port",
    name: "石梯漁港",
    shortName: "石梯漁港",
    aliases: ["石梯港", "石梯坪漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "花蓮縣",
    townName: "豐濱鄉",
    lat: 23.4892,
    lng: 121.5063,
    note: "第二類漁港"
  },
  {
    id: "pt_magong_fish",
    category: "port",
    name: "馬公漁港",
    shortName: "馬公漁港",
    aliases: ["馬公港", "澎湖馬公漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "澎湖縣",
    townName: "馬公市",
    lat: 23.5629,
    lng: 119.5665,
    note: "第二類漁港（澎湖）"
  },
  {
    id: "pt_nanliao_green",
    category: "port",
    name: "綠島南寮漁港",
    shortName: "綠島南寮漁港",
    aliases: ["南寮港(綠島)", "綠島漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "臺東縣",
    townName: "綠島鄉",
    lat: 22.6606,
    lng: 121.4694,
    note: "第二類漁港（綠島）"
  },
  {
    id: "pt_kaiyuan",
    category: "port",
    name: "開元漁港",
    shortName: "開元漁港",
    aliases: ["蘭嶼開元港", "開元港", "蘭嶼漁港"],
    subTypes: ["fishery_cat2"],
    countyName: "臺東縣",
    townName: "蘭嶼鄉",
    lat: 22.0566,
    lng: 121.5091,
    note: "第二類漁港（蘭嶼）"
  },
  {
    id: "pt_baishawei",
    category: "port",
    name: "白沙尾漁港",
    shortName: "白沙尾漁港",
    aliases: ["白沙觀光港", "小琉球白沙尾港", "白沙尾港"],
    subTypes: ["fishery_cat2"],
    countyName: "屏東縣",
    townName: "琉球鄉",
    lat: 22.3522,
    lng: 120.3827,
    note: "第二類漁港（小琉球）"
  },
  // 工業港 & 石化天然氣港（麥寮雙標籤自動去重）
  {
    id: "pt_hoping_ind",
    category: "port",
    name: "和平工業專用港",
    shortName: "和平工業港",
    aliases: ["和平工業港", "和平水泥專用港", "和平港"],
    subTypes: ["industrial"],
    countyName: "花蓮縣",
    townName: "秀林鄉",
    lat: 24.3036,
    lng: 121.7606,
    note: "工業專用港（水泥）"
  },
  {
    id: "pt_mailiao_ind",
    category: "port",
    name: "麥寮工業專用港",
    shortName: "麥寮工業港",
    aliases: ["麥寮工業港", "麥寮港", "六輕港", "麥寮石化工業港"],
    subTypes: ["industrial", "petro_lng"],
    countyName: "雲林縣",
    townName: "麥寮鄉",
    lat: 23.7885,
    lng: 120.1722,
    note: "工業專用港／石化工業港"
  },
  {
    id: "pt_yongan_lng",
    category: "port",
    name: "永安液化天然氣接收港",
    shortName: "永安天然氣港",
    aliases: ["永安天然氣港", "永安液化天然氣接收站", "永安接收站", "永安一接", "一接"],
    subTypes: ["petro_lng"],
    countyName: "高雄市",
    townName: "永安區",
    lat: 22.8206,
    lng: 120.2008,
    note: "液化天然氣接收港（一接）"
  },
  {
    id: "pt_taichung_lng",
    category: "port",
    name: "臺中液化天然氣接收港",
    shortName: "臺中天然氣港",
    aliases: ["台中液化天然氣接收港", "臺中天然氣港", "台中天然氣港", "臺中液化天然氣接收站", "台中接收站", "臺中二接", "二接"],
    subTypes: ["petro_lng"],
    countyName: "臺中市",
    townName: "梧棲區",
    lat: 24.2735,
    lng: 120.4970,
    note: "液化天然氣接收港（二接）"
  },
  {
    id: "pt_guantang_lng",
    category: "port",
    name: "觀塘液化天然氣接收港",
    shortName: "觀塘天然氣港",
    aliases: ["觀塘天然氣港", "觀塘工業港", "觀塘液化天然氣接收站", "大潭接收站", "第三天然氣接收站", "三接", "觀塘三接"],
    subTypes: ["petro_lng"],
    countyName: "桃園市",
    townName: "觀音區",
    lat: 25.0411,
    lng: 121.0445,
    note: "液化天然氣接收港（三接）"
  }
];

// Build fast lookup maps once admin-data.js is loaded
const TAIWAN_POI_BY_ID = new Map(TAIWAN_POI_DATA.map((p) => [p.id, p]));

function resolvePoiTownId(poi) {
  if (!poi || typeof ALL_TOWNS === "undefined") return null;
  if (poi._townId !== undefined) return poi._townId;
  const normCounty = String(poi.countyName || "").replace(/台/g, "臺");
  const normTown = String(poi.townName || "").replace(/台/g, "臺");
  const match = ALL_TOWNS.find(
    (t) => t.countyName.replace(/台/g, "臺") === normCounty && t.townName.replace(/台/g, "臺") === normTown
  );
  poi._townId = match ? match.id : null;
  return poi._townId;
}

function getPoiSubTypeMeta(category, subTypeId) {
  const list = category === "airport" ? AIRPORT_SUBTYPES : PORT_SUBTYPES;
  return list.find((s) => s.id === subTypeId) || null;
}
