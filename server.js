// 23.5° 剛剛好的城市 —— 網站伺服器 + 內容 API。
//
// 靜態頁面仍然是真的靜態 HTML：後台按下儲存時，伺服器把內容寫進磁碟後
// 用 lib/render.mjs 重新產生所有頁面，跟本機跑 `node build.js` 是同一份程式碼。
// 開機時也會重新產生一次，所以即使容器的檔案系統是暫時的也能自我修復。
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { writeSite, renderSite, ROOT } from './lib/render.mjs';
import * as gh from './lib/github.mjs';
import * as chat from './lib/chat.mjs';

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const CONTENT_FILE = join(DATA_DIR, 'content.json');
// 使用者回饋含訪客 email，只留在磁碟上，不會被同步到 GitHub。
const FEEDBACK_FILE = join(DATA_DIR, 'feedback.json');
const FEEDBACK_KEEP = 500;          // 最多保留幾筆
const FEEDBACK_PER_HOUR = 5;        // 同一個 IP 一小時最多幾筆
const SEED_FILE = join(ROOT, 'src', 'content.json');

// 後台密碼只從環境變數來，絕不寫進程式碼。沒設就等於停用後台寫入。
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
// 網站對外網址：填了才會輸出 og:image、canonical 與 sitemap.xml（這些不能用相對路徑）
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const SESSION_HOURS = 12;
const COOKIE = 'sh_admin';

// ── 自動同步回 GitHub ─────────────────────────────────────
// 每次存檔重設計時器，停手 SYNC_DELAY_MS 之後才推一次 ——
// 否則連續編輯會讓 Zeabur 一直重新部署。
let pushTimer = null, pushing = false, lastSync = null;

function schedulePush() {
  if (!gh.configured()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, gh.cfg.delayMs);
  lastSync = { state: 'pending', at: Date.now() + gh.cfg.delayMs };
}

async function pushNow() {
  if (!gh.configured() || pushing) return;
  pushing = true;
  clearTimeout(pushTimer);
  try {
    const files = { 'src/content.json': JSON.stringify(content, null, 2) + '\n', ...renderSite(content, SITE_URL) };
    const n = ['taste', 'culture', 'grow'].reduce((a, c) => a + (content.venues?.[c]?.length || 0), 0);
    const msg = `後台更新內容（${n} 個據點・${content.crops?.length || 0} 項農產・${content.news?.length || 0} 則報導）`;
    const r = await gh.commitFiles(files, msg);
    lastSync = r.skipped
      ? { state: 'skipped', reason: r.skipped, at: Date.now() }
      : { state: 'ok', sha: r.sha, at: Date.now() };
    console.log(`[${new Date().toISOString()}] GitHub 同步：` +
      (r.skipped ? `略過（${r.skipped}）` : `已推送 ${r.sha}，${r.files} 個檔案`));
  } catch (e) {
    lastSync = { state: 'error', error: e.message, at: Date.now() };
    console.error(`[${new Date().toISOString()}] GitHub 同步失敗：${e.message}`);
  } finally {
    pushing = false;
  }
}

// ── 內容存取 ──────────────────────────────────────────────
let content = null;

async function loadContent() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(CONTENT_FILE)) {
    await writeFile(CONTENT_FILE, readFileSync(SEED_FILE, 'utf8'), 'utf8');
    console.log('首次啟動：已從 src/content.json 建立', CONTENT_FILE);
  }
  content = JSON.parse(await readFile(CONTENT_FILE, 'utf8'));
}

/** 只接受預期的結構，避免把任意 JSON 寫進磁碟再渲染出去。 */
function validate(c) {
  const err = (m) => { throw new Error(m); };
  const str = (v, where) => {
    if (typeof v !== 'string') err(`${where} 必須是文字`);
    if (v.length > 4000) err(`${where} 太長（上限 4000 字）`);
    return v;
  };
  if (!c || typeof c !== 'object' || Array.isArray(c)) err('內容格式不對');
  if (!c.venues || typeof c.venues !== 'object') err('缺少 venues');
  for (const cat of ['taste', 'culture', 'grow']) {
    if (!Array.isArray(c.venues[cat])) err(`venues.${cat} 必須是陣列`);
    if (c.venues[cat].length > 200) err(`venues.${cat} 筆數過多`);
    for (const [i, v] of c.venues[cat].entries()) {
      const at = `venues.${cat}[${i}]`;
      str(v.name, `${at}.name`); str(v.feature ?? '', `${at}.feature`); str(v.text ?? '', `${at}.text`);
      if (v.meta !== undefined) {
        if (!Array.isArray(v.meta)) err(`${at}.meta 必須是陣列`);
        for (const m of v.meta) { str(m.k ?? '', `${at}.meta.k`); str(m.v ?? '', `${at}.meta.v`); }
      }
      if (v.map !== undefined) {
        const m = v.map;
        if (!m || typeof m !== 'object') err(`${at}.map 格式不對`);
        for (const k of ['x', 'y', 'lx', 'ly']) {
          if (typeof m[k] !== 'number' || !Number.isFinite(m[k])) err(`${at}.map.${k} 必須是數字`);
        }
        if (m.side !== 'l' && m.side !== 'r') err(`${at}.map.side 只能是 l 或 r`);
        if (m.label !== undefined) str(m.label, `${at}.map.label`);
      }
    }
  }
  if (!Array.isArray(c.crops)) err('crops 必須是陣列');
  for (const [i, cr] of c.crops.entries()) {
    str(cr.n ?? '', `crops[${i}].n`); str(cr.name, `crops[${i}].name`); str(cr.tag ?? '', `crops[${i}].tag`);
    if (cr.sections !== undefined) {
      if (!Array.isArray(cr.sections)) err(`crops[${i}].sections 必須是陣列`);
      for (const s of cr.sections) { str(s.h ?? '', `crops[${i}].h`); str(s.p ?? '', `crops[${i}].p`); }
    }
  }
  if (!Array.isArray(c.news)) err('news 必須是陣列');
  for (const [i, n] of c.news.entries()) {
    str(n.kind ?? '', `news[${i}].kind`); str(n.kindLabel ?? '', `news[${i}].kindLabel`);
    str(n.source ?? '', `news[${i}].source`); str(n.date ?? '', `news[${i}].date`);
    str(n.title, `news[${i}].title`); str(n.summary ?? '', `news[${i}].summary`);
    const u = str(n.url ?? '', `news[${i}].url`);
    if (u && !/^https?:\/\//i.test(u)) err(`news[${i}].url 只能是 http(s) 網址`);
  }
  return c;
}

// ── AI 客服 ───────────────────────────────────────────────
// 每一則訊息都是真的花錢，所以同時有「單一 IP 每小時」和「全站每日」兩道上限。
let chatSystem = null;              // 內容變動時重建
let chatLastError = null;           // 最近一次失敗，只給登入後的後台看
let chatDegraded = 0;               // 帳務／認證失敗後暫時關閉，避免訪客一直碰到壞掉的按鈕
const DEGRADE_MS = 10 * 60_000;
const chatUsable = () => chat.configured() && Date.now() > chatDegraded;
const chatHits = new Map();         // ip -> [時間, …]
let chatDay = { day: '', n: 0 };

const rebuildChatSystem = () => { chatSystem = chat.configured() ? chat.buildSystem(content) : null; };

function chatQuota(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (chatDay.day !== today) chatDay = { day: today, n: 0 };
  if (chatDay.n >= chat.cfg.dailyLimit) return '今天的客服對話量已達上限，請明天再來，或到「聯絡我們」留言。';
  const now = Date.now();
  const hits = (chatHits.get(ip) || []).filter((t) => now - t < 3600_000);
  chatHits.set(ip, hits);
  if (hits.length >= chat.cfg.perHour) return '你問得有點快，休息一下再繼續吧。';
  return null;
}

// ── 使用者回饋 ────────────────────────────────────────────
let feedback = [];
const fbLimit = new Map();          // ip -> [送出時間, …]

async function loadFeedback() {
  try {
    feedback = JSON.parse(await readFile(FEEDBACK_FILE, 'utf8'));
    if (!Array.isArray(feedback)) feedback = [];
  } catch { feedback = []; }
}
const saveFeedback = () =>
  writeFile(FEEDBACK_FILE, JSON.stringify(feedback, null, 2) + '\n', 'utf8');

function fbThrottled(ip) {
  const now = Date.now();
  const hits = (fbLimit.get(ip) || []).filter((t) => now - t < 3600_000);
  fbLimit.set(ip, hits);
  return hits.length >= FEEDBACK_PER_HOUR;
}

/** 只接受預期的欄位，長度超過就直接拒絕。 */
function readFeedback(raw) {
  const err = (m) => { throw new Error(m); };
  const str = (v, max, label, required) => {
    const t = typeof v === 'string' ? v.trim() : '';
    if (!t && required) err(`請填寫${label}`);
    if (t.length > max) err(`${label}太長了（上限 ${max} 字）`);
    return t;
  };
  const message = str(raw.message, 1000, '建議內容', true);
  const email = str(raw.email, 120, 'Email', false);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err('Email 格式看起來不對');
  return {
    id: randomUUID(),
    name: str(raw.name, 40, '稱呼', false),
    email,
    message,
    page: str(raw.page, 200, '頁面', false),
    at: new Date().toISOString(),
    read: false,
  };
}

// ── 登入 ──────────────────────────────────────────────────
const failures = new Map();                       // ip -> {n, until}

function throttled(ip) {
  const f = failures.get(ip);
  return !!(f && f.until > Date.now());
}
function noteFailure(ip) {
  const f = failures.get(ip) || { n: 0, until: 0 };
  f.n += 1;
  if (f.n >= 5) { f.until = Date.now() + 5 * 60_000; f.n = 0; }
  failures.set(ip, f);
}

function sign(exp) {
  return createHmac('sha256', ADMIN_PASSWORD).update(`v1:${exp}`).digest('base64url');
}
function issueToken() {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  return `${exp}.${sign(exp)}`;
}
function validToken(tok) {
  if (!ADMIN_PASSWORD || !tok) return false;
  const dot = tok.indexOf('.');
  if (dot < 0) return false;
  const exp = Number(tok.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const a = Buffer.from(tok.slice(dot + 1));
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
function checkPassword(given) {
  if (!ADMIN_PASSWORD) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(ADMIN_PASSWORD);
  // 先比長度會洩漏長度，但這裡沒有更好的無洩漏做法；至少內容比較是定時的。
  return a.length === b.length && timingSafeEqual(a, b);
}
const cookies = (req) => Object.fromEntries(
  (req.headers.cookie || '').split(';').map((c) => {
    const i = c.indexOf('=');
    return i < 0 ? ['', ''] : [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
  }));
const isAuthed = (req) => validToken(cookies(req)[COOKIE]);
const isHttps = (req) => (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

// ── HTTP ─────────────────────────────────────────────────
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
// 原始碼與資料不對外提供。
const BLOCKED = ['src/', 'data/', 'lib/', 'tools/', 'node_modules/', '.git/'];
const BLOCKED_FILES = ['server.js', 'build.js', 'package.json', 'package-lock.json', 'README.md'];

function send(res, code, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'content-type': type, 'x-content-type-options': 'nosniff', ...extra });
  res.end(body);
}
const json = (res, code, obj, extra) =>
  send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8', extra);

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => {
      n += c.length;
      if (n > limit) { reject(new Error('內容太大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** 找不到頁面時回自訂的 404 頁；讀不到就退回純文字。 */
async function notFound(res) {
  try {
    const body = await readFile(join(ROOT, '404.html'));
    return send(res, 404, body, TYPES['.html'], { 'cache-control': 'no-cache' });
  } catch {
    return send(res, 404, '找不到頁面');
  }
}

async function serveStatic(req, res, pathname) {
  let rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '').replace(/^\/+/, '');
  if (rel === '' ) rel = 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel.includes('..') || BLOCKED.some((b) => rel.startsWith(b)) || BLOCKED_FILES.includes(rel))
    return notFound(res);
  const ext = extname(rel).toLowerCase();
  if (!TYPES[ext]) return notFound(res);
  try {
    const body = await readFile(join(ROOT, rel));
    send(res, 200, body, TYPES[ext], { 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
  } catch {
    await notFound(res);
  }
}

const humanDelay = (ms) => (ms < 60_000 ? `${Math.round(ms / 1000)} 秒` : `${Math.round(ms / 60_000)} 分鐘`);

const syncStatus = () => ({
  enabled: gh.configured(),
  repo: gh.configured() ? gh.cfg.repo : null,
  delayMs: gh.cfg.delayMs,
  last: lastSync,
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';

  try {
    if (url.pathname === '/api/chat-enabled') {
      // 設定有問題時就不要讓按鈕出現 —— 點了只會失敗，比沒有更糟
      return json(res, 200, { enabled: chatUsable() });
    }

    if (url.pathname === '/api/session') {
      return json(res, 200, {
        configured: !!ADMIN_PASSWORD, authed: isAuthed(req),
        sync: isAuthed(req) ? syncStatus() : undefined,
        chat: isAuthed(req)
          ? { enabled: chat.configured(), usable: chatUsable(),
              degradedUntil: chatDegraded > Date.now() ? chatDegraded : null,
              model: chat.cfg.model, effort: chat.cfg.effort || null,
              perHour: chat.cfg.perHour, dailyLimit: chat.cfg.dailyLimit,
              usedToday: chatDay.day === new Date().toISOString().slice(0, 10) ? chatDay.n : 0,
              lastError: chatLastError }
          : undefined,
      });
    }

    // 讓後台可以「現在就同步」，不用等計時器
    if (url.pathname === '/api/sync' && req.method === 'POST') {
      if (!isAuthed(req)) return json(res, 401, { error: '請先登入。' });
      if (!gh.configured()) return json(res, 400, { error: '伺服器沒有設定 GitHub 同步。' });
      await pushNow();
      return json(res, 200, { sync: syncStatus() });
    }

    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (!ADMIN_PASSWORD)
        return json(res, 503, { error: '伺服器還沒設定 ADMIN_PASSWORD 環境變數，後台無法使用。' });
      if (throttled(ip)) return json(res, 429, { error: '嘗試太多次，請五分鐘後再試。' });
      const { password } = JSON.parse(await readBody(req, 4096) || '{}');
      if (!checkPassword(password)) { noteFailure(ip); return json(res, 401, { error: '密碼不對。' }); }
      failures.delete(ip);
      const cookie = `${COOKIE}=${issueToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}` +
        (isHttps(req) ? '; Secure' : '');
      return json(res, 200, { ok: true }, { 'set-cookie': cookie });
    }

    if (url.pathname === '/api/logout' && req.method === 'POST') {
      return json(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
    }

    if (url.pathname === '/api/chat') {
      if (req.method !== 'POST') return json(res, 405, { error: '不支援的方法' });
      if (!chatUsable())
        return json(res, 503, { error: '這個網站的 AI 客服暫時無法使用。' });

      const over = chatQuota(ip);
      if (over) return json(res, 429, { error: over });

      let body;
      try { body = JSON.parse(await readBody(req, 40_000) || '{}'); }
      catch { return json(res, 400, { error: '格式不對' }); }

      // 長度／空白這類問題先擋掉，不佔用額度也不呼叫 API
      const q = typeof body.message === 'string' ? body.message.trim() : '';
      if (!q) return json(res, 400, { error: '請先輸入問題' });
      if (q.length > 500) return json(res, 400, { error: '問題太長了（上限 500 字）' });

      try {
        const t0 = Date.now();
        // 先扣額度再打 API：失敗的請求也要計入，否則有人可以靠製造錯誤無限呼叫。
        chatHits.set(ip, [...(chatHits.get(ip) || []), Date.now()]);
        chatDay.n += 1;
        const out = await chat.ask(chatSystem, body.history, body.message);
        const u = out.usage || {};
        console.log(`[${new Date().toISOString()}] 客服問答 ${Date.now() - t0}ms ` +
          `in=${u.input_tokens ?? '?'} cached=${u.cache_read_input_tokens ?? 0} out=${u.output_tokens ?? '?'} ` +
          `（今日第 ${chatDay.n}/${chat.cfg.dailyLimit} 則）`);
        return json(res, 200, { reply: out.reply });
      } catch (e) {
        if (e instanceof Error && /太長|請先輸入/.test(e.message))
          return json(res, 400, { error: e.message });
        chatLastError = { at: Date.now(), status: e.status ?? null, message: String(e.message).slice(0, 300) };
        // 額度不足、key 無效這類設定問題不會自己好，暫時停用十分鐘再自動恢復，
        // 免得每個訪客都點到一個壞掉的客服。
        const setup = e.status === 401 || e.status === 403 ||
          (e.status === 400 && /credit|balance|quota|tier/i.test(String(e.message)));
        if (setup) chatDegraded = Date.now() + DEGRADE_MS;
        console.error('客服失敗：', e.status ?? '', e.message, setup ? '（設定問題，暫停 10 分鐘）' : '');
        // 錯誤細節只留在伺服器與後台，不送給訪客
        return json(res, 502, { error: '客服暫時無法回應，請稍後再試，或到「聯絡我們」留言。' });
      }
    }

    if (url.pathname === '/api/feedback') {
      // 訪客送出建議（公開，不需登入）
      if (req.method === 'POST') {
        let raw;
        try { raw = JSON.parse(await readBody(req, 20_000) || '{}'); }
        catch { return json(res, 400, { error: '格式不對' }); }

        // 蜜罐欄位：正常人看不到也不會填，機器人會。裝作成功但不存。
        if (typeof raw.website === 'string' && raw.website.trim()) {
          return json(res, 200, { ok: true });
        }
        if (fbThrottled(ip)) {
          return json(res, 429, { error: '送出太頻繁了，請稍後再試。' });
        }
        let item;
        try { item = readFeedback(raw); }
        catch (e) { return json(res, 400, { error: e.message }); }

        feedback.unshift(item);
        if (feedback.length > FEEDBACK_KEEP) feedback.length = FEEDBACK_KEEP;
        fbLimit.set(ip, [...(fbLimit.get(ip) || []), Date.now()]);
        await saveFeedback();
        console.log(`[${new Date().toISOString()}] 收到使用者建議（目前 ${feedback.length} 筆）`);
        return json(res, 200, { ok: true });
      }

      // 以下都要登入
      if (!isAuthed(req)) return json(res, 401, { error: '請先登入。' });

      if (req.method === 'GET') {
        return json(res, 200, { items: feedback, unread: feedback.filter((f) => !f.read).length });
      }
      if (req.method === 'PATCH') {
        const { id, read } = JSON.parse(await readBody(req, 4096) || '{}');
        const it = feedback.find((f) => f.id === id);
        if (!it) return json(res, 404, { error: '找不到這筆' });
        it.read = !!read;
        await saveFeedback();
        return json(res, 200, { ok: true });
      }
      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        const n = feedback.length;
        feedback = feedback.filter((f) => f.id !== id);
        if (feedback.length === n) return json(res, 404, { error: '找不到這筆' });
        await saveFeedback();
        return json(res, 200, { ok: true, left: feedback.length });
      }
      return json(res, 405, { error: '不支援的方法' });
    }

    if (url.pathname === '/api/content') {
      if (req.method === 'GET') {
        if (!isAuthed(req)) return json(res, 401, { error: '請先登入。' });
        return json(res, 200, content);
      }
      if (req.method === 'PUT') {
        if (!isAuthed(req)) return json(res, 401, { error: '請先登入。' });
        let next;
        try {
          next = validate(JSON.parse(await readBody(req)));
        } catch (e) {
          return json(res, 400, { error: e.message });
        }
        const body = JSON.stringify(next, null, 2) + '\n';
        await writeFile(CONTENT_FILE, body, 'utf8');
        content = next;
        const files = writeSite(content, SITE_URL);  // 立刻重新產生所有頁面
        rebuildChatSystem();                         // 客服的參考資料也跟著更新
        console.log(`[${new Date().toISOString()}] 內容已更新，重新產生 ${Object.keys(files).length} 個檔案`);
        schedulePush();                              // 停手一段時間後同步回 GitHub
        return json(res, 200, { ok: true, files: Object.keys(files), sync: syncStatus() });
      }
      return json(res, 405, { error: '不支援的方法' });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, '不支援的方法');
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error('請求處理失敗：', e);
    if (!res.headersSent) send(res, 500, '伺服器錯誤');
  }
});

await loadContent();
await loadFeedback();
rebuildChatSystem();
writeSite(content, SITE_URL);                        // 開機就把頁面重新產生一次
console.log(`內容：${CONTENT_FILE}`);
console.log(`使用者建議：${FEEDBACK_FILE}（目前 ${feedback.length} 筆）`);
console.log(SITE_URL ? `對外網址：${SITE_URL}（og:image / canonical / sitemap.xml 已啟用）`
                     : '對外網址：未設定 SITE_URL —— 分享預覽圖與 sitemap.xml 不會輸出');
console.log(ADMIN_PASSWORD ? '後台：已啟用（ADMIN_PASSWORD 已設定）'
                           : '後台：唯讀（未設定 ADMIN_PASSWORD，無法登入或儲存）');
console.log(chat.configured()
  ? `AI 客服：已啟用（${chat.cfg.model}${chat.cfg.effort ? '，effort ' + chat.cfg.effort : ''}，` +
    `每日上限 ${chat.cfg.dailyLimit} 則、每 IP 每小時 ${chat.cfg.perHour} 則）`
  : 'AI 客服：停用（未設定 ANTHROPIC_API_KEY）');
console.log(gh.configured()
  ? `GitHub 同步：已啟用 → ${gh.cfg.repo} (${gh.cfg.branch})，路徑前綴 ${gh.cfg.prefix || '(根目錄)'}，停手 ${humanDelay(gh.cfg.delayMs)}後推送`
  : 'GitHub 同步：停用（未設定 GITHUB_TOKEN / GITHUB_REPO）');

// 收到關閉訊號時，把還沒推的內容盡量推出去
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    console.log(`\n收到 ${sig}，關閉中…`);
    if (pushTimer) { clearTimeout(pushTimer); await pushNow().catch(() => {}); }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`埠號 ${PORT} 已經被占用了。可能是另一個伺服器還開著。\n` +
                  `換一個埠號：PORT=8001 npm start`);
    process.exit(1);
  }
  throw e;
});
server.listen(PORT, () => console.log(`http://localhost:${PORT}`));
