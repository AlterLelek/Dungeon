// Полная проверка MM6: запускает все CDP-харнесы по очереди.
// Запуск: node scripts/verify-mm6.mjs
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const scripts = readdirSync('scripts')
  .filter(f => /^cdp-mm6-.*\.mjs$/.test(f))
  .sort();
let failures = 0;
for (const file of scripts) {
  console.log('\n=== ' + file + ' ===');
  const r = spawnSync(process.execPath, [join('scripts', file)], { stdio: 'inherit' });
  if (r.status !== 0) { failures++; console.error('FAIL: ' + file); }
}
console.log('\nИТОГО: ' + (scripts.length - failures) + '/' + scripts.length + ' харнесов прошли');
process.exit(failures ? 1 : 0);
