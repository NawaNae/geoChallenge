// =========================================================================
// 1. COMPLETE VERIFIED TAIWAN 22 COUNTIES & 368 TOWNSHIPS DATASET
// =========================================================================
const TAIWAN_ADMIN_DATA = [
  {
    code: "63000", name: "臺北市", short: "台北", province: "直轄市", region: "north", isSpecial: true, lat: 25.09108, lng: 121.5598,
    towns: ["中正區","大同區","中山區","松山區","大安區","萬華區","信義區","士林區","北投區","內湖區","南港區","文山區"]
  },
  {
    code: "65000", name: "新北市", short: "新北", province: "直轄市", region: "north", isSpecial: true, lat: 24.91571, lng: 121.6739,
    towns: ["板橋區","三重區","中和區","永和區","新莊區","新店區","樹林區","鶯歌區","三峽區","淡水區","汐止區","瑞芳區","土城區","蘆洲區","五股區","泰山區","林口區","深坑區","石碇區","坪林區","三芝區","石門區","八里區","平溪區","雙溪區","貢寮區","金山區","萬里區","烏來區"]
  },
  {
    code: "68000", name: "桃園市", short: "桃園", province: "直轄市", region: "north", isSpecial: true, lat: 24.93759, lng: 121.2168,
    towns: ["桃園區","中壢區","大溪區","楊梅區","蘆竹區","大園區","龜山區","八德區","龍潭區","平鎮區","新屋區","觀音區","復興區"]
  },
  {
    code: "66000", name: "臺中市", short: "台中", province: "直轄市", region: "central", isSpecial: true, lat: 24.23321, lng: 120.9417,
    towns: ["中區","東區","南區","西區","北區","西屯區","南屯區","北屯區","豐原區","東勢區","大甲區","清水區","沙鹿區","梧棲區","后里區","神岡區","潭子區","大雅區","新社區","石岡區","外埔區","大安區","烏日區","大肚區","龍井區","霧峰區","太平區","大里區","和平區"]
  },
  {
    code: "67000", name: "臺南市", short: "台南", province: "直轄市", region: "south", isSpecial: true, lat: 23.1417, lng: 120.2513,
    towns: ["中西區","東區","南區","北區","安平區","安南區","永康區","歸仁區","新化區","左鎮區","玉井區","楠西區","南化區","仁德區","關廟區","龍崎區","官田區","麻豆區","佳里區","西港區","七股區","將軍區","學甲區","北門區","新營區","後壁區","白河區","東山區","六甲區","下營區","柳營區","鹽水區","善化區","大內區","山上區","新市區","安定區"]
  },
  {
    code: "64000", name: "高雄市", short: "高雄", province: "直轄市", region: "south", isSpecial: true, lat: 23.01087, lng: 120.666,
    towns: ["鹽埕區","鼓山區","左營區","楠梓區","三民區","新興區","前金區","苓雅區","前鎮區","旗津區","小港區","鳳山區","林園區","大寮區","大樹區","大社區","仁武區","鳥松區","岡山區","橋頭區","燕巢區","田寮區","阿蓮區","路竹區","湖內區","茄萣區","永安區","彌陀區","梓官區","旗山區","美濃區","六龜區","甲仙區","杉林區","內門區","茂林區","桃源區","那瑪夏區"]
  },
  {
    code: "10017", name: "基隆市", short: "基隆", province: "臺灣省", region: "north", isSpecial: false, lat: 25.10898, lng: 121.7081,
    towns: ["中正區","七堵區","暖暖區","仁愛區","中山區","安樂區","信義區"]
  },
  {
    code: "10018", name: "新竹市", short: "竹市", province: "臺灣省", region: "north", isSpecial: false, lat: 24.80395, lng: 120.9647,
    towns: ["東區","北區","香山區"]
  },
  {
    code: "10004", name: "新竹縣", short: "竹縣", province: "臺灣省", region: "north", isSpecial: false, lat: 24.70328, lng: 121.1252,
    towns: ["竹北市","竹東鎮","新埔鎮","關西鎮","湖口鄉","新豐鄉","芎林鄉","橫山鄉","北埔鄉","寶山鄉","峨眉鄉","尖石鄉","五峰鄉"]
  },
  {
    code: "10005", name: "苗栗縣", short: "苗栗", province: "臺灣省", region: "central", isSpecial: false, lat: 24.48927, lng: 120.9417,
    towns: ["苗栗市","頭份市","苑裡鎮","通霄鎮","竹南鎮","後龍鎮","卓蘭鎮","大湖鄉","公館鄉","銅鑼鄉","南庄鄉","頭屋鄉","三義鄉","西湖鄉","造橋鄉","三灣鄉","獅潭鄉","泰安鄉"]
  },
  {
    code: "10007", name: "彰化縣", short: "彰化", province: "臺灣省", region: "central", isSpecial: false, lat: 23.99297, lng: 120.4818,
    towns: ["彰化市","員林市","鹿港鎮","和美鎮","北斗鎮","溪湖鎮","田中鎮","二林鎮","線西鄉","伸港鄉","福興鄉","秀水鄉","花壇鄉","芬園鄉","大村鄉","埔鹽鄉","埔心鄉","永靖鄉","社頭鄉","二水鄉","田尾鄉","埤頭鄉","芳苑鄉","大城鄉","竹塘鄉","溪州鄉"]
  },
  {
    code: "10008", name: "南投縣", short: "南投", province: "臺灣省", region: "central", isSpecial: false, lat: 23.83876, lng: 120.9876,
    towns: ["南投市","埔里鎮","草屯鎮","竹山鎮","集集鎮","名間鄉","鹿谷鄉","中寮鄉","魚池鄉","國姓鄉","水里鄉","信義鄉","仁愛鄉"]
  },
  {
    code: "10009", name: "雲林縣", short: "雲林", province: "臺灣省", region: "central", isSpecial: false, lat: 23.75585, lng: 120.3897,
    towns: ["斗六市","斗南鎮","虎尾鎮","西螺鎮","土庫鎮","北港鎮","古坑鄉","大埤鄉","莿桐鄉","林內鄉","二崙鄉","崙背鄉","麥寮鄉","東勢鄉","褒忠鄉","臺西鄉","元長鄉","四湖鄉","口湖鄉","水林鄉"]
  },
  {
    code: "10020", name: "嘉義市", short: "嘉市", province: "臺灣省", region: "south", isSpecial: false, lat: 23.47545, lng: 120.4473,
    towns: ["東區","西區"]
  },
  {
    code: "10010", name: "嘉義縣", short: "嘉縣", province: "臺灣省", region: "south", isSpecial: false, lat: 23.45889, lng: 120.574,
    towns: ["太保市","朴子市","布袋鎮","大林鎮","民雄鄉","溪口鄉","新港鄉","六腳鄉","東石鄉","義竹鄉","鹿草鄉","水上鄉","中埔鄉","竹崎鄉","梅山鄉","番路鄉","大埔鄉","阿里山鄉"]
  },
  {
    code: "10013", name: "屏東縣", short: "屏東", province: "臺灣省", region: "south", isSpecial: false, lat: 22.54951, lng: 120.62,
    towns: ["屏東市","潮州鎮","東港鎮","恆春鎮","萬丹鄉","長治鄉","麟洛鄉","九如鄉","里港鄉","鹽埔鄉","高樹鄉","萬巒鄉","內埔鄉","竹田鄉","新埤鄉","枋寮鄉","新園鄉","崁頂鄉","林邊鄉","南州鄉","佳冬鄉","琉球鄉","車城鄉","滿州鄉","枋山鄉","三地門鄉","霧臺鄉","瑪家鄉","泰武鄉","來義鄉","春日鄉","獅子鄉","牡丹鄉"]
  },
  {
    code: "10002", name: "宜蘭縣", short: "宜蘭", province: "臺灣省", region: "north", isSpecial: false, lat: 24.69295, lng: 121.7195,
    towns: ["宜蘭市","羅東鎮","蘇澳鎮","頭城鎮","礁溪鄉","壯圍鄉","員山鄉","冬山鄉","五結鄉","三星鄉","大同鄉","南澳鄉"]
  },
  {
    code: "10015", name: "花蓮縣", short: "花蓮", province: "臺灣省", region: "east", isSpecial: false, lat: 23.7569, lng: 121.3542,
    towns: ["花蓮市","鳳林鎮","玉里鎮","新城鄉","吉安鄉","壽豐鄉","光復鄉","豐濱鄉","瑞穗鄉","富里鄉","秀林鄉","萬榮鄉","卓溪鄉"]
  },
  {
    code: "10014", name: "臺東縣", short: "台東", province: "臺灣省", region: "east", isSpecial: false, lat: 22.98461, lng: 120.9876,
    towns: ["臺東市","成功鎮","關山鎮","卑南鄉","鹿野鄉","池上鄉","東河鄉","長濱鄉","太麻里鄉","大武鄉","綠島鄉","海端鄉","延平鄉","金峰鄉","達仁鄉","蘭嶼鄉"]
  },
  {
    code: "10016", name: "澎湖縣", short: "澎湖", province: "臺灣省", region: "south", isSpecial: false, lat: 23.56548, lng: 119.6151,
    towns: ["馬公市","湖西鄉","白沙鄉","西嶼鄉","望安鄉","七美鄉"]
  },
  {
    code: "09020", name: "金門縣", short: "金門", province: "福建省", region: "islands", isSpecial: false, lat: 24.43679, lng: 118.3186,
    towns: ["金城鎮","金湖鎮","金沙鎮","金寧鄉","烈嶼鄉","烏坵鄉"]
  },
  {
    code: "09007", name: "連江縣", short: "連江", province: "福建省", region: "islands", isSpecial: false, lat: 26.1505, lng: 119.9397,
    towns: ["南竿鄉","北竿鄉","莒光鄉","東引鄉"]
  }
];

const COUNTY_COLORS = {
  "臺北市": "#38bdf8", "新北市": "#60a5fa", "桃園市": "#818cf8", "臺中市": "#fb923c",
  "臺南市": "#f472b6", "高雄市": "#34d399", "基隆市": "#2dd4bf", "新竹市": "#a78bfa",
  "新竹縣": "#c084fc", "苗栗縣": "#e879f9", "彰化縣": "#facc15", "南投縣": "#4ade80",
  "雲林縣": "#a3e635", "嘉義市": "#fb7185", "嘉義縣": "#f87171", "屏東縣": "#22d3ee",
  "宜蘭縣": "#38bdf8", "花蓮縣": "#6ee7b7", "臺東縣": "#fbbf24", "澎湖縣": "#93c5fd",
  "金門縣": "#fca5a5", "連江縣": "#fdba74"
};

const TOWN_ALIASES = {
  "頭份鎮": "頭份市",
  "員林鎮": "員林市",
  "霧台鄉": "霧臺鄉",
  "台西鄉": "臺西鄉",
  "台東市": "臺東市",
  "三民鄉": "那瑪夏區",
  "桃源鄉": "桃源區",
  "茂林鄉": "茂林區",
  "復興鄉": "復興區"
};

const COUNTY_ALIASES = {
  "桃園縣": "桃園市",
  "臺北縣": "新北市",
  "台北縣": "新北市"
};

function normTw(str) {
  if (!str) return "";
  let s = String(str).trim().replace(/台/g, "臺").replace(/\s+/g, "");
  if (COUNTY_ALIASES[s]) s = COUNTY_ALIASES[s];
  if (TOWN_ALIASES[s]) s = TOWN_ALIASES[s];
  return s;
}

const ALL_TOWNS = [];
const COUNTY_BY_NAME = {};
const COUNTY_BY_CODE = {};
TAIWAN_ADMIN_DATA.forEach((c) => {
  c.bounds = null;
  COUNTY_BY_NAME[c.name] = c;
  COUNTY_BY_CODE[c.code] = c;
  c.towns.forEach((tName, idx) => {
    const id = `${c.code}_${tName}`;
    const suffix = tName.slice(-1);
    const baseName = tName.length > 1 ? tName.slice(0, -1) : tName;
    const angle = (idx / c.towns.length) * Math.PI * 2;
    const radius = 0.035 + (idx % 4) * 0.025;
    const lat = +(c.lat + Math.sin(angle) * radius).toFixed(5);
    const lng = +(c.lng + Math.cos(angle) * radius).toFixed(5);
    ALL_TOWNS.push({
      id,
      countyCode: c.code,
      countyName: c.name,
      countyShort: c.short,
      province: c.province,
      isSpecial: c.isSpecial,
      townName: tName,
      baseName,
      suffix,
      fullCountyTown: `${c.name}${tName}`,
      fullHierarchyName: c.isSpecial ? `${c.name}${tName}` : `${c.province}${c.name}${tName}`,
      lat,
      lng,
      bounds: null,
      layers: []
    });
  });
});
