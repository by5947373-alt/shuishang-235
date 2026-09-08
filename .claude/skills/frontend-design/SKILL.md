---
name: frontend-design
description: 改「23.5° 剛剛好的城市」網站的樣式、版面或頁面時載入。內含這個站的設計系統規則、撕紙浪的運作方式、對比色的兩層底色陷阱，以及一支可直接跑的對比／溢出檢查腳本。動到 assets/style.css、src/pages/、src/partials/ 或任何顏色時都適用。
---

# 水上網站・前端設計

視覺參考日本幼兒園「牛津こどもの森」。對象是**親子出遊做食農教育**：
明亮、圓潤、好親近。不要往銳利／高冷的精品風走 —— 試過，客群不合適。

## 動樣式前先讀這一節：對比有兩層底色

**這是這個專案最常踩的坑，踩過三次。**

底色有兩層：奶油 `--cream #FDF7F2` 和蜜桃帶 `--band #F9E3D3`。
同一個顏色在兩層上的對比差很多：

| 顏色 | 奶油底 | 蜜桃帶 | 結果 |
|---|---|---|---|
| `#B04E24` | 4.99 ✓ | **4.28 ✗** | 只照奶油底調 → 蜜桃帶上不合格 |
| `#A64818` | 5.56 ✓ | 4.77 ✓ | 改照蜜桃帶算 → 兩層都過 |

**所以：所有 `-ink` 文字色一律照比較深的蜜桃帶計算。** 改任何顏色都要兩層都驗。

### 亮色只填色，文字用 -ink

`--orange` `--mustard` `--peach` `--sun` `--taste` `--culture` `--grow` `--gold`
是**填色與邊框**用的。當文字對比只有 1.5–3.2。

文字一律用 `-ink` 那組：`--orange-ink` `--sun-ink` `--taste-ink`
`--culture-ink` `--grow-ink` `--gold-ink`。區塊上的 `--acc` 對應 `--acc-ink`。

### 實心按鈕配白字

用 `--orange-btn #BE5730`（白字 4.57）。
**不要用亮橘 `--orange #E8845A`** —— 白字只有 2.91，不合格。

### `<button>` 一定要自己宣告 color

它有瀏覽器預設文字色，**不繼承父層**。漏了會變成看不見的黑字。
`.btn` `.tab2` `.row-pick` `.mini` `.filter` 都踩過。

## 撕紙浪

區塊之間的波浪邊是 `.wave::before`：用**區塊自己的底色**塗滿 SVG 遮罩，
往上挪 99%，蓋住上一區的下緣。

**浪屬於下面那一區。** 因為它在 DOM 裡比較晚，才會自然蓋過上一區。
反過來做（在上一區加 `::after`）會被下一區的背景蓋掉 —— 這是設計上的關鍵，不要改。

- 三種節奏 `--wave-a/b/c`，用 `.wave` / `.wave-b` / `.wave-c` 切換。
  遮罩透過 `--wv` 變數傳遞，`.wave-gold` 的金色刷痕才能跟著同一條輪廓。
- 區塊要設 `--sec-bg` 告訴浪自己是什麼顏色。`.sec` 和 `.sec-sand` 都設好了。
- **`.wave > .wrap` 不能寫成 `.wave > *`** —— 那會把絕對定位的 `.deco`
  強制改成 `position:relative`，裝飾就跑掉了。
- 整段包在 `@supports` 裡。不支援 mask 的瀏覽器不會看到一塊突出的長方形。

英雄區的漸層要收在**蜜桃色**上（不是奶油色），下一區的奶油色浪才看得出來。

## 其他會咬人的地方

**`[hidden]` 要 `!important`。** 任何設了 `display` 的 class 都會壓過瀏覽器
對 `[hidden]` 的預設值，讓「已隱藏」的區塊還佔著版面。樣式表最上面那行
`[hidden]{display:none !important}` 不要拿掉。

**進場動畫用 `backwards` 不用 `forwards`。** `forwards` 的填充會蓋過
篩選用的變暗規則，導致地圖篩選按鈕看起來沒作用。

**`.rise` 要靠 `.js` class 把關。** IntersectionObserver 沒觸發時
（JS 掛掉、瀏覽器不支援），沒有把關的話整頁內容都是隱形的。

**`.deco` 在 1180px 以下要收起來**，否則絕對定位的裝飾會撐出橫向捲軸。

**格線／flex 子項要 `min-width:0`。** 預設是 `auto`，內容撐得開容器，
`text-overflow:ellipsis` 永遠不會生效。後台的 573px 清單欄踩過。

## 產生流程

`src/site.json` 的 `nav` 是**頁面清單的唯一來源** —— 導覽列、sitemap、
要產生哪些頁面都從它來。格式是 `[檔名, 中文, english]`，英文會變成
導覽列的小標。不要在別的地方再維護一份頁面清單。

`site.json` 的 `url` 已經設成正式網址，所以**本機建置和伺服器產生的頁面
逐位元組相同**。空著的話伺服器（有 SITE_URL）會多寫 canonical 與 og:url，
本機不會，兩邊來回覆蓋製造無意義的 diff。

`versionAssets()` 依**檔案內容**算資產版本號。所以任何「產生檔案到
assets/ 」的步驟都必須跑在 `writeSite()` **之前**，否則頁面會引用到
上一版的雜湊，瀏覽器永遠吃不到新檔。

## 分類頁的剪影地圖

`{{silhouette:taste}}` 會產生黃色鄉界剪影 + 該分類的編號圖釘。
幾何在 `src/geo.json`（OSM，ODbL），原始座標系 1000x625，裁切到陸地範圍。

**首頁的互動地圖有自己那份內嵌路徑，改鄉界要兩邊一起改。**

圖釘只放編號、名稱交給下面的 NO.01–04 卡片 —— 水上市區那幾家店擠在一起
（品味類最近的兩點只差 0.54%），塞名稱一定互相蓋到。`declusterPins()` 會在
產生時把距離小於 6.5% 的點推開，完全重合的點先給一個固定初始偏移，
否則推力方向是 0 向量、永遠分不開。

## 一家店一頁

12 個單店頁是 `renderVenuePages()` 從 content.json 產生的，版型在
`src/partials/venue.html`。**不要手寫這些檔案**，改版型改 partial。

單店頁的剪影用 `renderSilhouetteOne()`：一個水滴圖釘掛著店名。
分類頁用 `renderSilhouette()`：多個編號圖釘、會先推開。兩者共用 `siloShell()`。

新增一家店只要動 content.json，頁面和 sitemap 都會自己長出來。

## 加欄位到 content.json 之前先讀這一段

**伺服器讀的是 volume 上的 `data/content.json`，`src/content.json` 只是
第一次開機的種子檔。** 種子檔裡新加的欄位，線上那份不會有。

而且後台一存檔，自動同步會把線上內容推回 git，**種子檔裡多加的欄位會被
整個蓋掉**。

實際踩過：在 seed 裡給每家店加 `art` 欄位指定插畫，本機看起來正常，
線上 12 家全部退回通用款。

所以：
- **設計決定**（哪家店配哪張圖、用什麼版型）放程式碼，用店名之類的
  穩定鍵去對應，對不到就安全退回。
- **使用者要編輯的內容**才放 content.json，而且要能從後台改。

## 圖片有兩個來源

`findPhoto(slot, photoDir)` 先找 volume（後台上傳的），再找 repo 的
`assets/photos/`。`photoSlots(content)` 是欄位清單，後台和伺服器共用同一份。

插畫**不畫表情**（使用者要求）。鴨子留了一顆眼點，因為完全沒有眼睛看起來像沒畫完。

後台可以逐店挑圖示，也可以上傳自己的樣式（存 `DATA_DIR/icons/`，key 是 `u-N`）。
選擇寫進 `content.json` 的 `art`。這條路安全 —— 後台寫的是 `data/content.json`，
本來就是伺服器讀的那份；會出事的是往 `src/content.json` 種子檔加欄位。

內建圖示是行內 SVG（跟著 CSS 變數換色），自訂的是 `<img>`（顏色固定）。
`iconHtml()` 決定用哪一種。

尺寸：分類頁卡片 `clamp(88px,17vw,120px)`、單店頁 `clamp(76px,11.5vw,104px)`。
放大後要重驗「圖示壓到文字」—— 卡片的 `.meta div` 有 `padding-right` 幫地址讓位，
改尺寸時那個值要跟著調。

## 卡片角落的 Q 版插畫

12 張手繪 SVG 在 `lib/art.mjs`，`content.json` 的 venue 用 `art` 欄位指定要哪一張，
沒指定就退回分類的通用款（`artFor()`）。

畫法要跟站上其他插畫一致：`viewBox="0 0 64 64"`、暖棕粗線 2.4、扁平填色、圓角收邊。
**一定要加點狀眼睛與腮紅**（`face()` / `blush()` 兩個 helper）——
少了表情就只是圖示，對親子客群差很多。

畫完一定要放大並排檢視，不要只看程式碼。第一版有四張認不出來
（牙膏像葉子、顏料像鉛筆、火車像貨車、香菇像盆栽），是並排看才發現的。

擺放位置：
- `.venue`（分類頁卡片）右下角，絕對定位。`.meta div` 要留 `padding-right` 讓地址換行。
- `.vh-card`（單店頁）右上角，**用 `float` 不要用絕對定位**。
  絕對定位要靠 `padding-right` 幫文字讓位，標題會被擠出
  「23.5° 天／文科學與太空探索」這種斷行；float 讓文字自然繞排。

### 量重疊時的陷阱

用 `getBoundingClientRect()` 比對區塊盒會誤判 —— float 和 padding 的盒子
本來就會跟插畫重疊，但文字沒有。要驗真正的文字有沒有被壓到，
用 `Range.selectNodeContents(textNode)` 再取 `getClientRects()`。

## 照片欄位：路徑一定要絕對

`.ph` 和 `.vhero` 的照片是用 `--src` 這個 custom property 傳進去的。

**路徑一定要寫 `/assets/photos/x.jpg`（開頭斜線）。**
custom property 裡的相對 `url()` 是相對於「使用它的樣式表」解析的，
不是相對於文件 —— 寫 `assets/photos/x.jpg` 會變成
`/assets/assets/photos/x.jpg`，404。

**這個 bug 不放真照片看不出來**：沒有照片時顯示的是備用底色，
版面完全正常，只有在真的放圖進去才會發現圖沒出現。實際踩過，
是比對線上與本機的網路請求才抓到的。驗證方式是真的放一張圖進去，
用 `new Image()` 拉一次確認 `naturalWidth` 有值。

`dropMissingPhotos()` 會在產生時檢查檔案在不在，不在就把整個 `--src`
拿掉，免得每次載入都對不存在的檔案發 404。檔案放進 `assets/photos/`
重新建置就會自動接回去。

## 照片欄位

`.ph` 沒放圖時顯示斜紋蜜桃底，不是破圖 —— 因為 `background-image`
第一層是 `var(--src,none)`，沒設就跳過，露出底下的紋理層。
加新欄位照這個模式，不要用 `<img>` 指向不存在的檔案。

檔名與規格見 `assets/photos/README.md`。

## 改完一定要驗

樣式改動要在瀏覽器實測，**不能只看程式碼**。這個 skill 附了
`audit.js`，貼進瀏覽器 console 會掃全頁對比與橫向溢出：

1. `node build.js`
2. 開 `http://localhost:8080`（`node server.js`）
3. 把 `audit.js` 的內容貼進 console
4. **1280px 和 375px 兩個寬度都要跑**，`不合格` 要是 0

首頁、品味、聯絡、後台四頁是基本盤。動到深色底（頁尾 `--foot`、
客服面板 `.chat-head`）時那幾頁也要驗。

### 用瀏覽器工具驗證時的兩個陷阱

- **預覽面板收起來時，捲動後的截圖是空白的** —— 頁面在隱藏狀態下不重繪。
  解法是暫時 `display:none` 掉前面的區塊，讓目標區塊落在頁面頂端。
- **隱藏狀態下 CSS 動畫會凍結**，截圖會抓到進場動畫做到一半的半透明畫面，
  看起來像顏色調錯。先注入 `*{animation:none !important}` 再截圖。
