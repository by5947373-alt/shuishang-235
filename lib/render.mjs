// 網站渲染：CLI（build.js）和伺服器（server.js）共用同一份，
// 所以本機建置和線上儲存後重新產生的頁面一定一致。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artFor } from './art.mjs';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const p = (...a) => join(ROOT, ...a);
const read = (...a) => readFileSync(p(...a), 'utf8');

const CAT_ORDER = ['taste', 'culture', 'grow'];
const CAT_LABEL = { taste: '品味', culture: '回歸', grow: '生長' };
const CAT_EN = { taste: 'CUISINE & SAVOR', culture: 'SIGHTSEEING & CULTURE', grow: 'AGRICULTURE & LOCAL CRAFT' };
/** 一家店一頁的檔名。用 分類-序號 而不是店名轉拼音 —— 拼音是猜的，序號不會錯。 */
const venueFile = (cat, i) => `${cat}-${pad2(i + 1)}.html`;

// 內容是後台打字進來的純文字，一律轉義後再放進 HTML。
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const jsStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const pad2 = (n) => String(n).padStart(2, '0');

export function frontMatter(text) {
  const i = text.indexOf('\n---\n');
  if (i < 0) return [{}, text];
  const meta = {};
  for (const line of text.slice(0, i).split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const c = t.indexOf(':');
    if (c < 0) throw new Error(`front-matter 這行少了冒號：${t}`);
    meta[t.slice(0, c).trim()] = t.slice(c + 1).trim();
  }
  return [meta, text.slice(i + 5)];
}

function renderVenues(items, cat) {
  return items.map((v, i) => {
    const metas = (v.meta || []).filter((m) => m.v)
      .map((m) => `<div><span class="k">${esc(m.k)}</span><span class="v">${esc(m.v)}</span></div>`).join('');
    const addr = (v.meta || []).find((m) => m.k === '地址')?.v || '';
    const gmap = addr
      ? `\n        <a class="gmap" target="_blank" rel="noopener noreferrer" ` +
        `href="https://www.google.com/maps/search/?api=1&amp;query=${escAttr(encodeURIComponent(addr.replace(/ /g, '')))}">在 Google 地圖開啟 →</a>`
      : '';
    return `      <article class="venue sticker rise" style="--acc:var(--${cat}); --acc-soft:var(--${cat}-soft); --acc-ink:var(--${cat}-ink)">\n` +
      `        <p class="venue-idx">NO. ${pad2(i + 1)}</p>\n` +
      `        <h3><a class="venue-link" href="${venueFile(cat, i)}">${esc(v.name)}</a></h3>\n` +
      `        <p class="feat">${esc(v.feature)}</p>\n` +
      `        <p>${esc(v.text)}</p>\n` +
      `        <div class="meta">${metas}</div>${gmap}\n` +
      `        <a class="venue-more" href="${venueFile(cat, i)}">看這一家 <span class="arrow" aria-hidden="true">→</span></a>\n` +
      `        ${artFor(v, cat)}\n` +
      `      </article>`;
  }).join('\n');
}

function renderCrops(items) {
  return items.map((c) => {
    const secs = (c.sections || [])
      .map((s) => `<section><h4>${esc(s.h)}</h4><p>${esc(s.p)}</p></section>`)
      .join('\n          ');
    return `      <article class="crop sticker rise">\n` +
      `        <div class="crop-id">\n` +
      `          <span class="n">${esc(c.n)}</span>\n` +
      `          <h3>${esc(c.name)}</h3>\n` +
      `          <span class="tag">${esc(c.tag)}</span>\n` +
      `        </div>\n` +
      `        <div>\n          ${secs}\n        </div>\n` +
      `      </article>`;
  }).join('\n');
}

function renderNews(items, limit) {
  return (limit ? items.slice(0, limit) : items).map((n) => {
    const meta = esc(n.source) + (n.date ? '　·　' + esc(n.date) : '');
    return `      <a class="item sticker rise" href="${escAttr(n.url)}" target="_blank" rel="noopener noreferrer">\n` +
      `        <div class="item-top"><span class="kind ${esc(n.kind)}">${esc(n.kindLabel)}</span><span class="item-src">${meta}</span></div>\n` +
      `        <h3>${esc(n.title)}</h3>\n` +
      `        <p>${esc(n.summary)}</p>\n` +
      `        <span class="item-go">前往原文 ↗</span>\n` +
      `      </a>`;
  }).join('\n');
}

/** 黃色鄉界剪影。兩種模式：
 *  - 分類頁：多個編號圖釘，對應下面 NO.01–04 的卡片
 *  - 單店頁：一個掛著店名的圖釘（跟參考站一樣）
 *
 *  幾何取自 src/geo.json（OpenStreetMap，ODbL），原始座標系 1000x625，
 *  這裡裁切到陸地範圍。首頁的互動地圖仍用自己那份內嵌路徑，兩邊要一起改。 */
function declusterPins(pts, aspect) {
  const MIN = 6.5;                       // 視覺上的最小間距（以寬度百分比計）
  const out = pts.map((p, i) => ({
    ...p,
    // 完全重合的點先給一個固定的初始偏移，否則推力方向是 0 向量、永遠分不開
    x: p.x + (i % 2 ? 0.01 : -0.01),
    y: p.y + (i % 3 ? 0.01 : -0.01),
  }));
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j];
        const dx = b.x - a.x, dy = (b.y - a.y) / aspect;   // 換算成等比空間再算距離
        const d = Math.hypot(dx, dy) || 0.001;
        if (d >= MIN) continue;
        const push = (MIN - d) / 2, ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push * aspect;
        b.x += ux * push; b.y += uy * push * aspect;
        moved = true;
      }
    }
    if (!moved) break;
  }
  for (const o of out) {                 // 別被推出畫面
    o.x = Math.min(96, Math.max(4, o.x));
    o.y = Math.min(94, Math.max(6, o.y));
  }
  return out;
}

function geoPoints(items) {
  const geo = JSON.parse(read('src', 'geo.json'));
  const [W, H] = geo.base, [cx, cy, cw, ch] = geo.crop;
  const pts = items.map((v, i) => ({
    n: i + 1,
    name: v.map?.label || v.name,
    x: v.map ? ((v.map.x / 100) * W - cx) / cw * 100 : null,
    y: v.map ? ((v.map.y / 100) * H - cy) / ch * 100 : null,
  })).filter((q) => q.x !== null);
  return { geo, pts, aspect: cw / ch };
}

function siloShell(geo, pinsHtml, footHtml) {
  const [cx, , cw] = [geo.crop[0], geo.crop[1], geo.crop[2]];
  return `      <div class="silo">
        <svg class="silo-map" viewBox="${escAttr(geo.viewBox)}" role="img" aria-label="嘉義縣水上鄉範圍，標示北回歸線與據點位置">
          <path d="${escAttr(geo.land)}"/>
          <line class="silo-tropic" x1="${cx}" y1="${geo.tropicY}" x2="${cx + cw}" y2="${geo.tropicY}"/>
        </svg>
${pinsHtml}
        <span class="silo-note silo-n1">從嘉義市區<br>開車 20 分鐘</span>
        <span class="silo-note silo-n2">北回歸線<br>從這裡穿過去</span>
        <svg class="silo-arrow" viewBox="0 0 90 54" aria-hidden="true">
          <path d="M4 48C18 26 44 8 78 12" fill="none" stroke-linecap="round"/>
          <path d="M64 4l16 8-13 11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
${footHtml}
      </div>`;
}

/** 分類頁：多點、只放編號。塞名稱一定會互相蓋到 —— 水上市區那幾家店
 *  最近的兩點只差 0.54%，所以先推開再畫，名稱交給下面的卡片。 */
function renderSilhouette(content, cat) {
  const { geo, pts, aspect } = geoPoints(content.venues?.[cat] || []);
  const pins = declusterPins(pts, aspect).map((q) =>
    `        <span class="silo-pin" style="left:${q.x.toFixed(2)}%; top:${q.y.toFixed(2)}%">` +
    `<i>${q.n}</i><span class="sr">${esc(q.name)}</span></span>`).join('\n');
  return siloShell(geo, pins,
    '        <p class="silo-foot">數字對應下面的店家編號　<a href="index.html#map">看完整互動地圖</a></p>');
}

/** 單店頁：一個圖釘，掛著店名。 */
function renderSilhouetteOne(v) {
  const { geo, pts } = geoPoints([v]);
  if (!pts.length) return siloShell(geo, '', '        <p class="silo-foot"><a href="index.html#map">看完整互動地圖</a></p>');
  const q = pts[0];
  const pin = `        <span class="silo-pin silo-solo" style="left:${q.x.toFixed(2)}%; top:${q.y.toFixed(2)}%">` +
    `<b>${esc(q.name)}</b><i></i></span>`;
  return siloShell(geo, pin, '        <p class="silo-foot"><a href="index.html#map">在完整地圖上看</a></p>');
}

function renderBlocks(main, content) {
  return main.replace(/\{\{(venues|crops|news|silhouette)(?::(\w+))?\}\}/g, (_m, kind, arg) => {
    if (kind === 'silhouette') {
      if (!content.venues[arg]) throw new Error(`{{silhouette:${arg}}} —— content.json 沒有這個分類`);
      return renderSilhouette(content, arg);
    }
    if (kind === 'venues') {
      if (!content.venues[arg]) throw new Error(`{{venues:${arg}}} —— content.json 沒有這個分類`);
      return renderVenues(content.venues[arg], arg);
    }
    if (kind === 'crops') return renderCrops(content.crops || []);
    return renderNews(content.news || [], arg ? parseInt(arg, 10) : 0);
  });
}

export function mapData(content) {
  const rows = [];
  for (const cat of CAT_ORDER) {
    for (const v of content.venues?.[cat] || []) {
      const mp = v.map;
      if (!mp) continue;
      const meta = Object.fromEntries((v.meta || []).map((m) => [m.k, m.v]));
      const f = String(v.feature || '');
      const dot = f.indexOf(' · ');
      const q = (x) => (x ? jsStr(x) : 'null');
      rows.push(
        `  {c:${jsStr(cat)}, n:${jsStr(mp.label || v.name)}, x:${mp.x}, y:${mp.y}, ` +
        `side:${jsStr(mp.side)}, lx:${mp.lx}, ly:${mp.ly}, f:${jsStr(dot < 0 ? f : f.slice(dot + 3))},\n` +
        `   a:${q(meta['地址'])}, t:${q(meta['電話'])}, h:${q(meta['營業'])}, e:${q(meta['Email'])}}`);
    }
  }
  return '/* 由 build.js 從內容資料產生 —— 不要直接編輯。 */\n' +
    'window.SHUISHANG_SPOTS = [\n' + rows.join(',\n') + '\n];\n';
}

/** 就地替換一個手寫 HTML 檔裡的資產版本號（可重複執行）。 */
export function versionAssetsIn(file) {
  const f = p(file);
  const before = readFileSync(f, 'utf8');
  const after = versionAssets(before.replace(/(assets\/[\w.-]+\.(?:css|js))\?v=[a-f0-9]+/g, '$1'), {});
  if (after !== before) writeFileSync(f, after, 'utf8');
  return Buffer.byteLength(after);
}

/** 給 assets 的 css/js 加上內容雜湊當版本號，這樣更新後訪客不會拿到快取裡的舊檔。 */
function versionAssets(html, generated) {
  const cache = new Map();
  return html.replace(/(?<=["'])assets\/([\w.-]+\.(?:css|js))(?=["'])/g, (m, name) => {
    if (!cache.has(name)) {
      let body = generated['assets/' + name];
      if (body === undefined) {
        const f = p('assets', name);
        body = existsSync(f) ? readFileSync(f) : null;
      }
      cache.set(name, body === null ? null : createHash('sha1').update(body).digest('hex').slice(0, 8));
    }
    const h = cache.get(name);
    return h ? `assets/${name}?v=${h}` : m;
  });
}

const navHtml = (nav, current) => nav
  .map(([href, label, en]) =>
    `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>` +
    `${esc(label)}${en ? `<em>${esc(en)}</em>` : ''}</a>`)
  .join('');

/** 一家店一頁。從 content.json 產生，不手寫 —— 12 家店手寫 12 個檔案
 *  改一次資料要改兩個地方，遲早會不同步。 */
function renderVenuePages(content, layout, header, footer, nav, base) {
  const tpl = read('src', 'partials', 'venue.html');
  const out = {};
  for (const cat of CAT_ORDER) {
    const items = content.venues?.[cat] || [];
    items.forEach((v, i) => {
      const file = venueFile(cat, i);
      const metas = (v.meta || []).filter((m) => m.v)
        .map((m) => `<div><span class="k">${esc(m.k)}</span><span class="v">${esc(m.v)}</span></div>`).join('');
      const addr = (v.meta || []).find((m) => m.k === '地址')?.v || '';
      const gmap = addr
        ? `          <a class="vh-cta" target="_blank" rel="noopener noreferrer" ` +
          `href="https://www.google.com/maps/search/?api=1&amp;query=${escAttr(encodeURIComponent(addr.replace(/ /g, '')))}">` +
          `在 Google 地圖開啟<span class="arrow" aria-hidden="true">→</span></a>`
        : '';
      // 同分類的其他店，最多三家
      const sibs = items.map((x, j) => ({ x, j })).filter(({ j }) => j !== i).slice(0, 3)
        .map(({ x, j }) => `        <a class="sib" href="${venueFile(cat, j)}">\n` +
          `          <span class="sib-idx">NO. ${pad2(j + 1)}</span>\n` +
          `          <span class="sib-name">${esc(x.name)}</span>\n` +
          `          <span class="sib-feat">${esc(x.feature)}</span>\n` +
          `        </a>`).join('\n');

      const main = tpl
        .replace(/\{\{slug\}\}/g, file.replace(/\.html$/, ''))
        .replace(/\{\{cat\}\}/g, cat)
        .replace(/\{\{catLabel\}\}/g, CAT_LABEL[cat])
        .replace(/\{\{catEn\}\}/g, esc(CAT_EN[cat]))
        .replace(/\{\{idx\}\}/g, pad2(i + 1))
        .replace(/\{\{name\}\}/g, esc(v.name))
        .replace(/\{\{feature\}\}/g, esc(v.feature))
        .replace(/\{\{text\}\}/g, esc(v.text))
        .replace('{{art}}', '          ' + artFor(v, cat))
        .replace('{{silhouette}}', renderSilhouetteOne(v))
        .replace('{{meta}}', metas)
        .replace('{{gmap}}', gmap)
        .replace('{{siblings}}', sibs);

      const title = `${v.name}｜${CAT_LABEL[cat]}・23.5° 剛剛好的城市`;
      const desc = `${v.name}：${v.feature}。${String(v.text).slice(0, 70)}`;
      const headExtra = base
        ? `<link rel="canonical" href="${base}/${file}">\n` +
          `<meta property="og:url" content="${base}/${file}">\n` +
          `<meta property="og:image" content="${base}/assets/og.png">\n` +
          `<meta property="og:image:width" content="1200">\n` +
          `<meta property="og:image:height" content="630">\n`
        : '';

      const html = layout
        .replace(/\{\{title\}\}/g, esc(title))
        .replace(/\{\{desc\}\}/g, escAttr(desc))
        .replace('{{headExtra}}', headExtra)
        .replace('{{header}}', header.replace('{{nav}}', navHtml(nav, cat + '.html')))
        .replace('{{main}}', main)
        .replace('{{footer}}', footer)
        .replace('{{scripts}}', '');

      const left = html.match(/\{\{(\w+)\}\}/g);
      if (left) throw new Error(`${file} 還有沒填的佔位符：${[...new Set(left)].join(', ')}`);
      out[file] = html;
    });
  }
  return out;
}

/** 產生所有頁面。content 省略時讀 src/content.json；
 *  baseUrl 省略時用 src/site.json 的 url（伺服器會用 SITE_URL 環境變數覆寫）。
 *  回傳 {檔名: 內容}。 */
export function renderSite(content, baseUrl) {
  const site = JSON.parse(read('src', 'site.json'));
  content = content || JSON.parse(read('src', 'content.json'));
  const layout = read('src', 'layout.html');
  const header = read('src', 'partials', 'header.html');
  const footer = read('src', 'partials', 'footer.html');
  const nav = site.nav.map((x) => [x[0], x[1], x[2]]);
  const extra = site.extraPages || [];
  // 網站網址設了才輸出絕對網址的標籤 —— og:image 與 canonical 不能用相對路徑。
  const base = (baseUrl ?? site.url ?? '').replace(/\/+$/, '');
  const out = {};

  for (const f of [...nav.map((n) => n[0]), ...extra]) {
    const [meta, main] = frontMatter(read('src', 'pages', f));
    for (const k of ['title', 'desc']) {
      if (!(k in meta)) throw new Error(`${f} 的 front-matter 少了 ${k}`);
    }
    const current = (meta.nav || f.replace(/\.html$/, '')) + '.html';
    const scripts = (meta.scripts || '').split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => `<script src="${s}"></script>\n`).join('');

    const headExtra = base
      ? `<link rel="canonical" href="${base}/${f}">\n` +
        `<meta property="og:url" content="${base}/${f}">\n` +
        `<meta property="og:image" content="${base}/assets/og.png">\n` +
        `<meta property="og:image:width" content="1200">\n` +
        `<meta property="og:image:height" content="630">\n`
      : '';

    const html = layout
      .replace(/\{\{title\}\}/g, esc(meta.title))
      .replace(/\{\{desc\}\}/g, escAttr(meta.desc))
      .replace('{{headExtra}}', headExtra)
      .replace('{{header}}', header.replace('{{nav}}', navHtml(nav, current)))
      .replace('{{main}}', renderBlocks(main, content))
      .replace('{{footer}}', footer)
      .replace('{{scripts}}', scripts);

    const left = html.match(/\{\{(\w+)\}\}/g);
    if (left) throw new Error(`${f} 還有沒填的佔位符：${[...new Set(left)].join(', ')}`);
    out[f] = html;
  }
  const venuePages = renderVenuePages(content, layout, header, footer, nav, base);
  Object.assign(out, venuePages);

  out['assets/map-data.js'] = mapData(content);
  for (const f of Object.keys(out)) {
    if (f.endsWith('.html')) out[f] = versionAssets(out[f], out);
  }

  out['robots.txt'] = 'User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\n' +
    (base ? `\nSitemap: ${base}/sitemap.xml\n` : '');

  if (base) {
    out['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      [...nav.map(([f]) => f), ...Object.keys(venuePages)]
        .map((f) => `  <url><loc>${base}/${f === 'index.html' ? '' : f}</loc></url>`).join('\n') +
      '\n</urlset>\n';
  }
  return out;
}

/** 把 renderSite 的結果寫進網站根目錄。 */
export function writeSite(content, baseUrl) {
  const files = renderSite(content, baseUrl);
  for (const [f, body] of Object.entries(files)) {
    mkdirSync(dirname(p(f)), { recursive: true });
    writeFileSync(p(f), body, 'utf8');
  }
  return files;
}

export { read, p, esc, escAttr, frontMatter as _fm, renderBlocks as _blocks };
