/* 全頁對比與橫向溢出檢查。貼進瀏覽器 console 直接跑。
   1280px 和 375px 兩個寬度都要驗 —— 這個站的 -ink 色是照蜜桃帶算的，
   兩層底色都要過 WCAG AA。 */
(() => {
  // 顏色要同時吃 rgb(0-255) 和 color(srgb 0-1)。
  // 早期版本沒處理 color(srgb …)，把 0.99 當成 0.99/255，
  // 結果把 header 誤判成一堆不合格 —— 別再犯。
  const toRGB = (c) => {
    const m = c.match(/[\d.]+/g).map(Number);
    return c.startsWith('color(')
      ? [m[0] * 255, m[1] * 255, m[2] * 255, m.length > 3 ? m[3] : 1]
      : [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
  };
  const lum = (c) => {
    const [r, g, b] = toRGB(c).slice(0, 3).map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // 半透明底（例如 backdrop-blur 的表頭）要跟底下那層混色，不能當實色算
  const bgOf = (el) => {
    let n = el; const stack = [];
    while (n && n !== document.documentElement) {
      const b = getComputedStyle(n).backgroundColor;
      if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) {
        const p = toRGB(b); stack.push(p);
        if (p[3] >= 0.999) break;
      }
      n = n.parentElement;
    }
    stack.push([253, 247, 242, 1]);           // --cream 收底
    let out = stack[stack.length - 1].slice(0, 3);
    for (let i = stack.length - 2; i >= 0; i--) {
      const s = stack[i], a = s[3];
      out = [0, 1, 2].map((k) => s[k] * a + out[k] * (1 - a));
    }
    return `rgb(${out.map(Math.round).join(',')})`;
  };

  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.5) continue;
    if (!el.getClientRects().length) continue;
    const fg = cs.color, bg = bgOf(el);
    const L1 = lum(fg), L2 = lum(bg);
    const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = (px >= 24 || (bold && px >= 18.66)) ? 3 : 4.5;
    if (cr < need) bad.push({
      sel: String(el.className).slice(0, 28) || el.tagName,
      txt: el.textContent.trim().slice(0, 16),
      fg, bg, cr: +cr.toFixed(2), need, px: +px.toFixed(1),
    });
  }

  // 地圖是刻意可橫向捲動的，不算溢出
  const wide = [...document.querySelectorAll('body *')]
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.map-scroll');
    })
    .map((e) => String(e.className).slice(0, 30) || e.tagName);

  // 預覽面板收起來時 innerWidth 會是 0，溢出判斷會全部誤報 —— 直接講清楚
  if (!innerWidth) {
    return { 錯誤: 'innerWidth 是 0：視窗或預覽面板沒展開，溢出檢查不可信。展開後重跑。',
             不合格: bad.length, 明細: bad.slice(0, 12) };
  }

  const out = {
    頁面: location.pathname,
    視窗: innerWidth,
    不合格: bad.length,
    明細: bad.slice(0, 12),
    橫向溢出: document.documentElement.scrollWidth > innerWidth,
    超出右緣: [...new Set(wide)].slice(0, 8),
  };
  console.table(bad);
  return out;
})();
