# 23.5° 剛剛好的城市

嘉義縣水上鄉觀光與地方創生網站。Node 伺服器 + 靜態頁面，零套件相依（只用 Node 內建模組）。

頁面是真的靜態 HTML —— 後台按下儲存時，伺服器把內容寫進磁碟並重新產生所有頁面。
所以線上改完馬上生效，但訪客拿到的仍然是純 HTML，沒有 JavaScript 也讀得到內容。

## 跑起來

```bash
npm start                       # http://localhost:8080
ADMIN_PASSWORD=你的密碼 npm start   # 加上後台
```

設 `SITE_URL=https://你的網域` 之後，頁面才會帶上 `og:image`、`canonical`
與 `sitemap.xml`（這些不能用相對路徑）。沒設的話網站照常運作，只是分享到
LINE／FB 不會有預覽卡片。

後台在 **/admin.html**。沒設 `ADMIN_PASSWORD` 就無法登入也無法儲存（唯讀）。

## 建置

版型、導覽列、頁尾只有一份，各頁只寫自己的內容。改完 `src/` 之後跑：

```bash
node build.js
```

會產生根目錄的六個 HTML 檔、`assets/map-data.js` 和 `tools/preview.html`。
伺服器儲存內容時走的是同一支 `lib/render.mjs`，所以本機建置和線上存檔產生的頁面一定一致。

`src/site.json` 的 `nav` 是唯一的頁面清單：新增一頁就在那裡加一筆，
再建一個同名的 `src/pages/<檔名>.html`。清單裡列了但檔案不存在會直接報錯，
`src/pages/` 裡有檔案但沒列進清單則會提醒。

### src/ 的結構

| 檔案 | 內容 |
|---|---|
| `src/site.json` | 導覽列項目＝頁面清單 |
| `src/layout.html` | 外層版型（`{{title}}` `{{desc}}` `{{header}}` `{{main}}` `{{footer}}` `{{scripts}}`） |
| `src/partials/header.html` | 導覽列（`{{nav}}` 由建置填入，會自動標記目前頁面） |
| `src/partials/footer.html` | 頁尾 |
| `src/pages/*.html` | 各頁的 `<main>` 內容，開頭幾行是 front-matter |
| `src/content.json` | 店家、景點、農產、報導、地圖圖釘的資料（由後台編輯器維護） |
| `src/quiz.json` | 問診題庫：10 題、5 種診斷、每種 4 味共 8 個藥引 |

頁面裡用 `{{venues:taste}}`、`{{venues:culture}}`、`{{venues:grow}}`、`{{crops}}`、
`{{news}}`、`{{news:3}}` 這些佔位符，建置時會換成 `content.json` 的內容。

頁面檔開頭長這樣，用 `---` 和內容隔開：

```
title: 品味・水上在地美食｜23.5° 剛剛好的城市
desc: 嘉義水上四家在地美食……
scripts: assets/map.js
---
<section class="sec">…</section>
```

`scripts` 和 `nav`（導覽列反白哪一項，預設就是自己）都可以省略。

## 產生的頁面

| 檔案 | 內容 |
|---|---|
| `index.html` | Hero、地方介紹、三大服務項目、互動式地圖、散策路線、報導摘要 |
| `taste.html` | 品味・水上在地美食（4 家） |
| `culture.html` | 回歸・水上景點與文化（4 處） |
| `grow.html` | 生長・水上農產（3 大作物）與創生店家（4 家） |
| `quiz.html` | 風土百草堂・問診：十題測驗產出專屬行程「藥單」 |
| `news.html` | 相關報導與資源（全部為外部連結） |
| `contact.html` | 聯絡資訊、Google 地圖嵌入、交通指引 |
| `assets/style.css` | 全站樣式與設計 token（含深淺色主題） |
| `assets/site.js` | 捲動進場、頁尾年份 |
| `assets/map.js` | 互動式地圖的據點資料與互動邏輯 |
| `server.js` | 網站伺服器：靜態檔 + 內容 API + 存檔後重新產生頁面 |
| `lib/render.mjs` | 渲染邏輯，CLI 與伺服器共用 |
| `build.js` | 本機建置指令 |
| `admin.html` | 後台（登入 + 編輯 + 發佈） |
| `404.html` | 找不到頁面時顯示（由 `src/pages/404.html` 產生） |
| `robots.txt` / `sitemap.xml` | 給搜尋引擎，建置時產生 |
| `assets/og.png` | 分享到 LINE／FB 的預覽圖（1200×630） |
| `assets/favicon.svg`／`icon-180.png` | 瀏覽器分頁圖示與 iOS 加到主畫面的圖示 |
| `lib/github.mjs` | 自動 commit 回 GitHub |
| `lib/chat.mjs` | AI 客服：用網站內容組系統提示詞並呼叫 Claude |
| `assets/chat.js` | 前台右下角的客服小視窗 |
| `sync.js` | 手動把線上內容抓回 `src/content.json`（`npm run sync`） |
| `tools/build_map.py` | 由 OpenStreetMap 資料產生地圖幾何（僅在需要重繪地圖時使用） |
| `tools/preview.html` | 六頁打包成單檔的預覽版，由 `build.py` 產生，網站本身用不到 |
| `assets/map-data.js` | 地圖圖釘資料，由 `build.py` 從 `content.json` 產生，不要手改 |

根目錄的 `.html` 是建置產物，**不要直接編輯** —— 下次執行 `build.py` 會被覆蓋。
要改版面請改 `src/`。

## 本機預覽

```bash
python3 -m http.server 8000
```

然後開 http://localhost:8000

## 後台

網址是 **/admin.html**（線上、本機都一樣）。用 `ADMIN_PASSWORD` 登入，
左邊選分類（品味／回歸／生長店家／三大農產／相關報導），可以新增、編輯、
上下移動、刪除，右邊即時顯示這張卡片在網站上長什麼樣。

按「**儲存並發佈到網站**」→ 伺服器寫入 `data/content.json` → 立刻重新產生所有頁面。
訪客重新整理就看得到，不用重新部署。

編輯到一半的內容會暫存在瀏覽器（localStorage），關掉分頁不會不見。

### 線上改的內容會自動同步回 GitHub

設好下面的環境變數之後，你在後台按儲存 → 網站立刻生效 → **停止編輯 10 分鐘後，
伺服器自動把 `src/content.json` 和產生的頁面 commit 回 repo**，不用手動下載或 commit。

| 環境變數 | 說明 |
|---|---|
| `GITHUB_TOKEN` | 有該 repo **Contents: read and write** 權限的 token（fine-grained personal access token 即可） |
| `GITHUB_REPO` | `by5947373-alt/shuishang-235` |
| `GITHUB_BRANCH` | 預設 `main` |
| `GITHUB_PATH_PREFIX` | 網站在 repo 裡的子目錄。這個 repo 的網站就在根目錄，所以**留空不用設** |
| `SYNC_DELAY_MS` | 停手多久後才推，預設 `600000`（10 分鐘） |

**為什麼要等 10 分鐘：** 每次 push 都會觸發 Zeabur 重新部署。延遲合併之後，
連續編輯十筆只會在你停手後推一次，網站不會一直重啟。等不及的話，後台有
「立刻同步到 GitHub」按鈕。

後台會顯示同步狀態（預計推送時間／已推送的 commit／失敗原因）。
**同步失敗不影響網站** —— 內容已經寫進磁碟也已經生效，只是還沒進 git。

設定完可以先驗證 token 和 repo 設定對不對（唯讀，不會寫入）：

```bash
GITHUB_TOKEN=… GITHUB_REPO=by5947373-alt/shuishang-235 npm run gh:check
```

## AI 客服

右下角的「問問水上」小視窗，用網站自己的內容回答訪客問題。
**沒設 `ANTHROPIC_API_KEY` 時整個功能停用**，按鈕也不會出現。

| 環境變數 | 說明 |
|---|---|
| `ANTHROPIC_API_KEY` | 到 https://console.anthropic.com 申請 |
| `AI_MODEL` | 預設 `claude-opus-5` |
| `AI_EFFORT` | 預設 `low`（觀光問答不需要深度推理，這樣又快又省）。換成不支援 effort 的舊模型時設成空字串 |
| `AI_DAILY_LIMIT` | 全站每日訊息上限，預設 `300` |
| `AI_PER_HOUR` | 同一個 IP 每小時上限，預設 `12` |

### 「credit balance is too low」不一定是真的沒錢

Anthropic 這個錯誤訊息有三種成因：帳戶真的沒餘額、**要用的模型需要更高的使用層級**、
或是**在儲值前就建好的 key 變成 stale**。後兩種的解法分別是換 `AI_MODEL`
和重新建一把 key，跟儲值無關。

遇到額度不足、key 無效這類**設定問題時，客服會自動停用十分鐘**（前台按鈕直接隱藏，
訪客不會點到一個必定失敗的功能），十分鐘後自動重試。後台會顯示停用原因與恢復時間。

**每一則對話都是真的花錢**，所以有兩道上限：單一 IP 每小時，以及全站每日。
額度在呼叫 API 之前就先扣，失敗的請求也算 —— 否則有人可以靠製造錯誤無限呼叫。
輸入格式問題（空白、超長）在扣額度前就擋掉，不會浪費配額。

系統提示詞由 `lib/content.json` 的內容自動組成，你在後台改完店家資料，
客服的回答依據也會同步更新，不用另外維護一份問答集。

提示詞裡明確要求：只依據網站資料回答、資料裡沒有的就說不知道、
不要編造營業時間或價格、與水上鄉無關的要求一律婉拒。
但 AI 仍有可能出錯，所以視窗下方有標註「重要資訊請以店家公告為準」。

### 手動把線上內容抓回本機

```bash
SITE_URL=https://你的網域 ADMIN_PASSWORD=你的密碼 npm run sync
```

會把線上內容寫回 `src/content.json`；沒有變動就不動檔案。

### 沒有後端時的退路

如果只用 `python3 -m http.server` 開這一頁（沒有跑 `npm start`），後台會自動切成
**檔案模式**：一樣可以編輯，但只能「下載 content.json → 覆蓋 `src/content.json`
→ `node build.js` → commit」。

### 其他不在後台裡的東西

- **地圖圖釘**：也在 `content.json` 裡，每個據點的 `map` 欄位（後台有表單可以填）。
  `x` / `y` 是圖釘位置（百分比），`lx` / `ly` 是名稱標籤偏移（px，用引線拉開擠在一起的市區店家），
  `side` 決定標籤往左或往右，`label` 是地圖上的短名。`assets/map-data.js` 是產生出來的，不要手改。
- **頁面框架文字**（單元標題、引言、散策路線、悄悄話、聯絡資訊）：在 `src/pages/` 裡。
- **問診題目與藥引**：改 `src/quiz.json` 再跑 `build.js`（會產生 `assets/quiz-data.js`）。
  藥引的 `src` 欄位是店家名稱，請跟 `content.json` 裡的店家保持一致。
  這一份目前不在後台編輯器裡，要改得動 JSON。
- **配色**：改 `assets/style.css` 開頭的 `:root` token；深色主題的同名 token 在下方兩個區塊，三處要一起改。

### 色票

| Token | 值 | 用在哪 |
|---|---|---|
| `--sand` | `#E4CBA9` | **主色調 —— 頁面底色**、地圖陸地 |
| `--sky` | `#7FC7CC` | 八掌溪、地圖水域 |
| `--deepsea` | `#092F33` | 主要文字、英雄區與頁尾底色 |
| `--moss` | `#4B5B34` | 生長分類 |
| `--terracotta` | `#AF5031` | 品味分類 |
| `--blossom` | `#FDABA5` | 柔性點綴 |
| `--wine` | `#980204` | 品牌重點色（`--brand`） |
| `--sunshine` | `#EAB913` | 回歸分類、北回歸線、太陽 |

### 顏色有兩組：填色用的和文字用的

`--sun` / `--taste` / `--culture` / `--grow` / `--gold` 是**填色與邊框**用的。
把它們直接當文字色，在淺色底上對比只有 1.5–3.2，看不清楚。

所以另外有一組 `--sun-ink` / `--taste-ink` / `--culture-ink` / `--grow-ink` / `--gold-ink`，
**文字一律用 `-ink` 那組**。深色主題底下兩組數值相同（亮色在深底上本來就夠對比）。

同理，區塊上的 `--acc` 有對應的 `--acc-ink`。

### 風格定位

對象是**親子出遊做食農教育**，所以走明亮、圓潤、好親近的路線：
圓角 16px、柔和陰影、Fredoka + Noto Sans TC 粗體、明亮的天空漸層英雄區。
不要往銳利／高冷的精品風走 —— 那個方向試過，對這個客群不合適。

主色調是 **SAND `#E4CBA9`**，直接當頁面底色。版面分三層：
SAND 頁底 → `--sunk`（較淺的沙）交替區塊 → `--paper`（近白）卡片。

底色偏中間調，所以次要文字（`--ink-3`、`--gold-ink`、各分類的 `-ink`）
都比一般淺底網站更深。改底色時**務必重跑對比檢查**，這些值是配著 SAND 算出來的。

### 只有一套視覺，不跟系統深色模式

網站**固定 SAND 底色**，不隨訪客的系統深色模式翻轉 —— `:root` 宣告了
`color-scheme:light`，樣式表裡也沒有任何 `prefers-color-scheme` 或
`[data-theme]` 覆寫。所以色彩 token 只要維護一組。

之前有做深色主題，但深色模式下底色會變成 DEEP SEA 而不是 SAND，
跟「主色調是 SAND」的定位衝突，所以拿掉了。

### 深色底的區塊

頁尾是 DEEP SEA 深色底，裡面的文字要用淺色（寫死，不要用 `--ink`）。
英雄區是 `--hero1` → `--hero2` → `--ground` 的漸層，收在 SAND 上。

`[hidden]` 也要注意：任何設了 `display` 的 class 都會壓過瀏覽器對 `[hidden]`
的預設值，讓「已隱藏」的區塊還佔著版面。樣式表最上面有一行
`[hidden]{display:none !important}` 把它釘死，不要拿掉。

`<button>` 也要注意：它有自己的瀏覽器預設文字色，**不會繼承**父層。
任何按鈕樣式都必須自己宣告 `color`，否則深色主題下會變成看不見的黑字。

## 部署到 Zeabur

這是純靜態網站，不需要 Node.js 或任何伺服器程式。

1. 把這個資料夾推上 GitHub（可以是獨立 repo，或現有 repo 的子目錄）。
2. Zeabur → Create Service → Git → 選這個 repo。
3. Zeabur 偵測到根目錄有 `index.html` 會自動以 **Static** 部署（不需要在雲端跑 `build.py`，
   建置產物已經在 repo 裡）。
   若網站放在子目錄，在服務設定裡把 Root Directory 指到 `shuishang/`。
4. 綁定網域即可上線。

沒有需要設定的環境變數。

## 資料來源與授權

- 文字、店家資訊：《水上手冊》（P.01–P.11）。
- 地圖幾何（鄉界、八掌溪、台鐵縱貫線）：**OpenStreetMap 貢獻者，ODbL 授權**。
  網站上必須保留來源標註 —— 目前放在地圖下方與各頁頁尾。
- 相關報導：全部為外部連結，僅引用標題與摘要，不轉載原文。

## 尚未完成

- **分享預覽圖是通用的一張**（`assets/og.png`），所有頁面共用。要各頁不同圖的話
  可以在 `src/pages/*.html` 的 front-matter 加欄位再改 `lib/render.mjs`。
- AI 客服的**實際模型呼叫沒有經過實測** —— 開發時沒有 API key，
  驗證到的是：停用狀態、輸入驗證、額度控管、API 失敗時的降級、前台介面。
  設好 key 之後請自己問幾個問題確認。
- 後台只有單一組密碼，沒有多帳號。修改紀錄靠自動同步產生的 git commit。
- 頁面框架文字（單元標題、引言、散策路線、聯絡資訊）還是要改 `src/` 再重新部署，
  後台目前只管內容資料。
- 客服對話不會留存，重新整理頁面就清空；也沒有記錄可供事後查看。
- 專案本身的對外聯絡信箱待補，目前 `src/pages/contact.html` 標示為「待補」。
- 待收錄據點：尼克牛排、水上機場、二馬肉鬆 —— 手冊原稿只有名稱，沒有店家資訊。
