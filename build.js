#!/usr/bin/env node
// 本機建置：node build.js
// 和線上儲存走同一支 lib/render.mjs，所以兩邊產生的頁面一定一致。
import { writeSite, versionAssetsIn } from './lib/render.mjs';
import { buildPreview } from './lib/preview.mjs';
import { writeQuizData } from './lib/render.mjs';

const files = writeSite();
for (const [f, body] of Object.entries(files)) {
  console.log('  %s %s bytes', f.padEnd(20), String(Buffer.byteLength(body)).padStart(6));
}
// admin.html 是手寫的、不走版型，但它的 css/js 也要帶版本號，
// 否則更新後開後台會吃到快取裡的舊樣式。
// 問診題庫：src/quiz.json → assets/quiz-data.js
writeQuizData();

const adminBytes = versionAssetsIn('admin.html');
console.log('  %s %s bytes', 'admin.html'.padEnd(20), String(adminBytes).padStart(6));

const n = buildPreview();
console.log('  %s %s bytes', 'tools/preview.html'.padEnd(20), String(n).padStart(6));
console.log('完成。');
