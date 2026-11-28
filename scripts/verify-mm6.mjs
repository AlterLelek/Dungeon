// Полная проверка MM6: запускает все CDP-харнесы по очереди.
// Запуск: node scripts/verify-mm6.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Версия обязана расти механически: каждый запуск verify требует бампа
// минорной части package.json относительно последнего зафиксированного значения.
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const versionMinor = Number(String(pkg.version).split('.')[1]);
const lastVersionPath = '.last-version';
const lastVersion = existsSync(lastVersionPath)
  ? Number(readFileSync(lastVersionPath, 'utf8').trim())
  : 0;
if (!Number.isFinite(versionMinor) || !Number.isFinite(lastVersion) || versionMinor <= lastVersion) {
  console.error('VERSION NOT BUMPED');
  process.exit(1);
}
writeFileSync(lastVersionPath, String(versionMinor));
console.log('Версия подтверждена: ' + pkg.version + ' (было ' + lastVersion + ')');

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
