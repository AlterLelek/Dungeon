// CDP-проверка части 1 прогрессии: rules.js, сейв v2 и миграция старых сейвов.
// Запуск: node scripts/cdp-mm6-progression-p1.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';

const root = process.cwd();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const file = normalize(join(root, rel));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const chromePath = process.env.CHROME_PATH ||
  ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!chromePath) { console.error('Chrome не найден; задайте CHROME_PATH'); server.close(); process.exit(1); }
const debugPort = 9700 + Math.floor(Math.random() * 200);
const profile = await mkdtemp(join(tmpdir(), 'mm6-progression-p1-'));
const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const consoleErrors = [], badResponses = [];
function send(method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++seq; pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      const page = list.find(x => x.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  throw new Error('CDP не подключился');
}
let failures = 0;
function check(name, ok, info = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${info ? ' · ' + info : ''}`);
  if (!ok) failures++;
}
try {
  ws = new WebSocket(await connect());
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      consoleErrors.push(m.params.args.map(a => a.value || a.description || '').join(' '));
    if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.text);
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400)
      badResponses.push(m.params.response.status + ' ' + m.params.response.url);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
    }
  };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  }
  async function waitFor(expr, timeout = 10000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await ev(expr)) return true; await sleep(60); }
    throw new Error('таймаут: ' + expr);
  }
  async function click(x, y) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 10000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);

  const report = await ev('window.__mm6Debug.progressionReport()');
  check('прогрессия: отчёт без ошибок и сейв версии 3', report.ok && report.version === 3,
    JSON.stringify({ ok: report.ok, errors: report.errors, version: report.version }));
  check('XP-кривая 50/(100)/150', report.curve.base === 50 && report.curve.cost2 === 50 &&
    report.curve.cost3 === 100 && report.curve.total3 === 150, JSON.stringify(report.curve));
  check('затухание: мышь на 9 уровней ниже даёт 10%',
    report.diminishing.mouseAtSameLevel === 25 && report.diminishing.mouse9Below === 3,
    JSON.stringify(report.diminishing));

  const migrated = await ev(`(()=>{
    const key='mm6_world_save_v1';
    if(!window.__mm6Debug.saveWorld()) return {saved:false};
    const raw=JSON.parse(localStorage.getItem(key));
    raw.version=1;
    ['clockMinutes','hunger','lootCounters','floorLoot','pendingXp','pendingLoot','battleLimit'].forEach(k=>delete raw[k]);
    raw.gold=999; raw.party[0].exp=777;
    raw.party.forEach(h=>['level','skillXp','skills','skillCooldown','promotion'].forEach(k=>delete h[k]));
    localStorage.setItem(key,JSON.stringify(raw));
    if(!window.__mm6Debug.loadWorld()) return {loaded:false};
    const g=window.__mm6State(), h=g.party[0], r=window.__mm6Debug.progressionReport();
    return {saved:true,loaded:true,version:g.version,gold:g.gold,exp:h.exp,level:h.level,
      fields:!!(h.skillXp&&h.skills&&h.skillCooldown&&h.promotion&&g.clockMinutes!==undefined&&
        g.hunger!==undefined&&g.lootCounters&&Array.isArray(g.floorLoot)),
      items:g.bag.length,report:r.ok};
  })()`);
  check('старый сейв загружается и мигрирует без потерь',
    migrated.saved && migrated.loaded && migrated.version === 3 && migrated.gold === 999 &&
    migrated.exp === 777 && migrated.level === 1 && migrated.fields && migrated.items > 0 && migrated.report,
    JSON.stringify(migrated));
  const unknownIds = await ev(`(()=>{
    const key='mm6_world_save_v1',d=window.__mm6Debug;
    if(!d.saveWorld()) return {saved:false};
    const raw=JSON.parse(localStorage.getItem(key));
    raw.bag.push({uid:'x-ghost',id:'ghost_sword',type:'weapon',name:'Призрачный меч',dmg:1,baseDmg:1,cost:1,sell:1,icon:'⚔'});
    raw.bag.push({uid:'x-herb',id:'c2-herb',type:'herb',name:'Трава',icon:'🌿',cost:1,sell:1});
    raw.bag.push({uid:'x-catalog',id:'sword_dark_ice',type:'weapon',name:'Тёмный ледяной меч',dmg:9,cost:5,sell:2,icon:'⚔'});
    localStorage.setItem(key,JSON.stringify(raw));
    if(!d.loadWorld()) return {loaded:false};
    const ids=window.__mm6State().bag.map(i=>i.id);
    return {saved:true,loaded:true,ghost:ids.includes('ghost_sword'),herb:ids.includes('c2-herb'),
      catalog:ids.includes('sword_dark_ice')};
  })()`);
  check('неизвестные catalog- id молча отбрасываются, остальные остаются',
    unknownIds.saved && unknownIds.loaded && !unknownIds.ghost && unknownIds.herb && unknownIds.catalog,
    JSON.stringify(unknownIds));
  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `PROGRESSION P1 CHECKS FAILED (${failures})` : 'PROGRESSION P1 CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
