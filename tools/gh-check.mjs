// 檢查 GitHub 同步設定對不對。跑法：npm run gh:check
//
// fine-grained token 有幾個很容易漏的步驟（忘記選 repository、
// Contents 沒改成 read and write），錯的時候 GitHub 只回一句 404，
// 所以這裡把常見狀況翻成人話。
import * as gh from '../lib/github.mjs';

const 說明 = {
  401: [
    'token 無效或已過期。',
    '  · 確認貼進 GITHUB_TOKEN 的值沒有多餘的空白或換行',
    '  · fine-grained token 有有效期限，過期要重新產生',
  ],
  404: [
    '找不到這個 repo —— 通常不是名字打錯，而是 token 沒涵蓋它。',
    '  · fine-grained token 要在 Repository access 明確勾選 shuishang-235',
    '  · 確認 GITHUB_REPO 是 owner/repo 格式，例如 by5947373-alt/shuishang-235',
  ],
  403: [
    '權限不足。',
    '  · Permissions → Repository permissions → Contents 要設成 Read and write',
  ],
};

try {
  const r = await gh.check();
  if (!r.ok) {
    console.log('✗', r.reason);
    console.log('  在 Zeabur 的服務設定裡加上 GITHUB_TOKEN 與 GITHUB_REPO，再重新部署。');
    process.exit(1);
  }
  if (!r.canWrite) {
    console.log('✗ 讀得到 repo，但這個 token 不能寫入。');
    console.log('  Permissions → Repository permissions → Contents 要設成 Read and write。');
    process.exit(1);
  }
  console.log('✓ GitHub 同步可用');
  console.log(`  repo    ${r.repo}`);
  console.log(`  branch  ${r.branch}（目前 ${r.head}）`);
  console.log(`  路徑    ${r.prefix}`);
  console.log(`  推送    停手 ${Math.round(gh.cfg.delayMs / 1000)} 秒後推一次`);
} catch (e) {
  const lines = 說明[e.status];
  console.log('✗', e.message);
  if (lines) lines.forEach((l) => console.log(' ', l));
  process.exit(1);
}
