// 店家卡片右下角的 Q 版插畫。
//
// 畫法跟站上其他插畫一致：暖棕粗線（var(--deepsea) 現在是 #6B4A3A）、
// 扁平填色、圓角收邊。不畫表情。
//
// content.json 的 venue 用 art 欄位指定要哪一張；沒指定就退回分類的通用款。
const S = (body) =>
  `<svg class="q-art" viewBox="0 0 64 64" aria-hidden="true">` +
  `<g fill="none" stroke="var(--deepsea)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">` +
  body + '</g></svg>';


export const ART = {
  // ── 品味 ──
  duck: S(                                            // 烤鴨
    '<path d="M11 43c0-10 8-17 19-17s19 7 19 17c0 7-8 11-19 11S11 50 11 43z" fill="var(--orange)"/>' +
    '<path d="M25 34c4-4 10-4 14 0" stroke-width="2"/>' +
    '<circle cx="43" cy="20" r="9.5" fill="var(--orange)"/>' +
    '<path d="M52 18l8 2.5-8 2.5z" fill="var(--mustard)"/>' +
    '<circle cx="41" cy="18" r="1.6" fill="var(--deepsea)" stroke="none"/>' +
    '<path d="M6 56h52" stroke-width="2.6"/>'),
  soup: S(                                            // 仙菇干貝雞：香菇站在碗裡
    '<path d="M10 32h44c0 13-9 21-22 21S10 45 10 32z" fill="var(--paper)"/>' +
    '<path d="M29 24h6v8h-6z" fill="var(--paper)"/>' +
    '<path d="M21 24c0-6 5-10 11-10s11 4 11 10z" fill="var(--moss)"/>' +
    '<path d="M6 32h52" stroke-width="2.6"/>' +
    '<path d="M14 22c-2-3-2-6 0-9M50 22c2-3 2-6 0-9" stroke-width="2"/>'),
  croissant: S(                                       // 仙草可頌
    '<path d="M8 40c2-13 12-21 24-21s22 8 24 21c-5-3-9 1-13-1-4-2-5-6-11-6s-7 4-11 6c-4 2-8-2-13 1z" fill="var(--mustard)"/>' +
    '<path d="M23 24c2 4 2 8 1 12M41 24c-2 4-2 8-1 12" stroke-width="2"/>'),
  ricebowl: S(                                        // 火雞肉飯
    '<path d="M9 31h46c0 13-10 21-23 21S9 44 9 31z" fill="var(--paper)"/>' +
    '<path d="M15 31c3-8 9-12 17-12s14 4 17 12z" fill="var(--mustard)"/>' +
    '<path d="M5 31h54" stroke-width="2.6"/>' +
    '<path d="M24 24c3-2 6-2 9 0M34 20c3 1 5 3 6 5" stroke-width="1.9"/>'),
  // ── 回歸 ──
  rocket: S(                                          // 太空教育館
    '<path d="M32 5c7 6 11 15 11 25v9H21v-9c0-10 4-19 11-25z" fill="var(--paper)"/>' +
    '<path d="M21 31L11 41v8l10-6M43 31l10 10v8l-10-6" fill="var(--orange)"/>' +
    '<circle cx="32" cy="23" r="7.5" fill="var(--sky)"/>' +
    '<path d="M26 47c2 6 4 9 6 12 2-3 4-6 6-12z" fill="var(--mustard)"/>'),
  train: S(                                           // 南靖糖廠：蒸汽小火車
    '<path d="M11 21h19v23H11z" fill="var(--mustard)"/>' +
    '<path d="M30 27h17c3 0 5 2 5 5v12H30z" fill="var(--orange)"/>' +
    '<path d="M40 15h8v12h-8z" fill="var(--orange)"/>' +
    '<rect x="16" y="26" width="9" height="8" rx="2" fill="var(--paper)"/>' +
    '<path d="M5 50h54" stroke-width="2.6"/>' +
    '<circle cx="19" cy="47" r="4.6" fill="var(--paper)"/>' +
    '<circle cx="42" cy="47" r="4.6" fill="var(--paper)"/>' +
    '<circle cx="44" cy="8" r="3.6" fill="var(--paper)"/>' +
    '<circle cx="53" cy="5" r="2.6" fill="var(--paper)"/>'),
  tooth: S(                                           // 白人牙膏：軟管＋擠出的膏
    '<rect x="27" y="4" width="10" height="7" rx="2" fill="var(--mustard)"/>' +
    '<path d="M23 11h18v31H23z" fill="var(--paper)"/>' +
    '<path d="M22 42h20v5c0 2-1 3-3 3H25c-2 0-3-1-3-3z" fill="var(--peach)"/>' +
    '<path d="M27 42v8M32 42v8M37 42v8" stroke-width="1.7"/>' +
    '<path d="M50 14c1 3 4 4 6 4-2 1-5 2-6 5-1-3-4-4-6-5 2 0 5-1 6-4z" fill="var(--mustard)"/>'),
  coffee: S(                                          // 品皇咖啡
    '<path d="M12 26h32v14c0 7-6 12-16 12s-16-5-16-12z" fill="var(--paper)"/>' +
    '<path d="M44 30h6c4 0 6 3 6 6s-2 6-6 6h-6" fill="var(--peach)"/>' +
    '<path d="M8 26h38" stroke-width="2.6"/>' +
    '<path d="M20 18c0-4 3-5 3-8M30 18c0-4 3-5 3-8" stroke-width="2"/>'),
  // ── 生長 ──
  teacup: S(                                          // 仙草茶：深色飲料杯＋吸管
    '<path d="M42 4L34 20" stroke="var(--orange)" stroke-width="3.6"/>' +
    '<path d="M17 19h30l-3 31c0 3-3 5-12 5s-12-2-12-5z" fill="var(--deepsea)" stroke="var(--deepsea)"/>' +
    '<path d="M13 19h38" stroke-width="2.6"/>' +
    '<path d="M21 33h22M23 42h18" stroke="var(--mustard)" stroke-width="2.2"/>'),
  brush: S(                                           // 仙草顏料：畫筆＋一道刷痕
    '<path d="M26 5h12v27H26z" fill="var(--mustard)"/>' +
    '<path d="M24 32h16v8H24z" fill="var(--peach)"/>' +
    '<path d="M27 40h10c0 10-2 15-5 15s-5-5-5-15z" fill="var(--deepsea)" stroke="var(--deepsea)"/>' +
    '<path d="M8 59q11-7 22-1t26-5" stroke="var(--deepsea)" stroke-width="3.4"/>'),
  pineapple: S(                                       // 在地蔬果
    '<path d="M32 22c9 0 15 7 15 16s-6 16-15 16-15-7-15-16 6-16 15-16z" fill="var(--mustard)"/>' +
    '<path d="M23 30l18 16M41 30L23 46" stroke-width="1.7"/>' +
    '<path d="M32 22c-2-6-6-9-11-10 2 5 4 8 7 10M32 22c2-6 6-9 11-10-2 5-4 8-7 10M32 22V8" fill="var(--moss)"/>'),
  lotus: S(                                           // 蓮藕橫切面：孔要夠大才看得出來
    '<circle cx="32" cy="35" r="19" fill="var(--peach)"/>' +
    '<circle cx="32" cy="35" r="5" fill="var(--paper)"/>' +
    '<circle cx="32" cy="23" r="4.4" fill="var(--paper)"/>' +
    '<circle cx="43" cy="30" r="4.4" fill="var(--paper)"/>' +
    '<circle cx="39" cy="43" r="4.4" fill="var(--paper)"/>' +
    '<circle cx="25" cy="43" r="4.4" fill="var(--paper)"/>' +
    '<circle cx="21" cy="30" r="4.4" fill="var(--paper)"/>' +
    '<path d="M32 16c0-5 4-8 4-8s4 3 4 8" fill="var(--moss)"/>'),
};

/** 店名 → 插畫。
 *
 *  為什麼放在程式碼而不是 content.json：伺服器讀的是 volume 上的
 *  data/content.json，src/content.json 只是第一次開機的種子檔。
 *  把 art 寫進種子檔，線上那份不會有這個欄位（實際踩到過，線上 12 家
 *  全部退回通用款）。而且後台一存檔，自動同步會把線上內容推回 git，
 *  種子檔裡多加的欄位會被整個蓋掉。
 *
 *  哪家店配哪張圖本來就是設計決定，不是使用者要編輯的內容，放這裡才對。 */
const BY_NAME = {
  廣東烤鴨莊: 'duck',
  雨豆樹咖啡輕飲: 'soup',
  烘焙旅程: 'croissant',
  林叨抵嘉火雞肉飯: 'ricebowl',
  北回歸線太空教育館: 'rocket',
  南靖糖廠休閒廣場: 'train',
  白人牙膏觀光工廠: 'tooth',
  品皇咖啡觀光工廠: 'coffee',
  仙圃企業: 'teacup',
  水上美生活文化工作室: 'brush',
  青木堂: 'pineapple',
  嘉義縣水上鄉農會: 'lotus',
};

/** 分類的通用款 —— 對不到店名時用，新增店家不會破圖。 */
const FALLBACK = { taste: 'ricebowl', culture: 'train', grow: 'pineapple' };

/** content.json 的 art 欄位優先（之後若真的加了就會生效），
 *  再來查店名，都對不到就用分類通用款。 */
export const artFor = (v, cat) =>
  ART[v?.art] || ART[BY_NAME[v?.name]] || ART[FALLBACK[cat]] || '';
