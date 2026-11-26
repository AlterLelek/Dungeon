// CDP-проверка части 4: тиры/варианты монстров, лучники, лут, логовища и стаи.
// Запуск: node scripts/cdp-mm6-progression-p4.mjs
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
const debugPort = 9760 + Math.floor(Math.random() * 120);
const profile = await mkdtemp(join(tmpdir(), 'mm6-progression-p4-'));
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

  const report = await ev('window.__mm6Debug.monsterReport()');
  check('профили всех монстров, угроза и новый бюджет боя', report.ok,
    JSON.stringify({ ok: report.ok, errors: report.errors, threat: report.threat, battle: report.battle }));
  check('мышь — солдат 1 уровня за 25 XP, угроза растёт каждые 3 уровня',
    report.profiles.mouse.level === 1 && report.profiles.mouse.baseXp === 25 &&
    report.threat.at1 === 1 && report.threat.at4 === 2 && report.threat.at7 === 4,
    JSON.stringify({ mouse: report.profiles.mouse, threat: report.threat }));
  check('стаи 4–8 и лимит активных врагов 12',
    report.packs.length >= 3 && report.packs.every(n => n >= 4 && n <= 8) && report.battle.limit === 12,
    JSON.stringify({ packs: report.packs, limit: report.battle.limit }));

  const mice = await ev(`['soldier','wizard','king'].map(v=>window.__mm6Debug.spawnVariant('mouse',v))`);
  check('три варианта мыши — только перекраска спрайта',
    mice.length === 3 && new Set(mice.map(x => x.tint)).size === 3 &&
    mice.every(x => x.variantId && x.id === 'mouse') &&
    !mice[0].magic && !mice[0].heavyBlow && mice[1].magic && mice[2].magic && mice[2].heavyBlow,
    JSON.stringify(mice.map(x => ({ v: x.variantId, tint: x.tint, magic: x.magic, heavy: x.heavyBlow }))));
  check('волшебница использует заклинания 1 круга, король — сильный удар и магию',
    mice[1].spells.length > 0 && mice[1].spells.every(id => ['fire', 'ice', 'lightning_weak', 'poison', 'curse', 'heal_weak', 'shield'].includes(id)) &&
    mice[2].spells.includes('lightning_all') && mice[2].atk > mice[0].atk,
    JSON.stringify({ wizard: mice[1].spells, king: mice[2].spells, atk: [mice[0].atk, mice[2].atk] }));

  const archerGate = await ev(`({
    goblin:window.__mm6Debug.pickVariant('goblin',[0.01]),
    mouse:window.__mm6Debug.pickVariant('mouse',[0.9,0.9]),
    turtle:window.__mm6Debug.pickVariant('turtle',[0.9,0.9]),
    orc:window.__mm6Debug.pickVariant('orc',[0.01])
  })`);
  const archers = await ev(`[window.__mm6Debug.spawnVariant('goblin','archer'),window.__mm6Debug.spawnVariant('orc','archer')]`);
  check('лучники только у гуманоидов, одного цвета, мыши и черепахи не стреляют',
    archerGate.goblin === 'archer' && archerGate.orc === 'archer' &&
    archerGate.mouse !== 'archer' && archerGate.turtle !== 'archer' &&
    archers.every(x => x.ranged && x.tint === '#86efac' && x.missChance >= .15 && x.missChance <= .2),
    JSON.stringify({ gate: archerGate, archers: archers.map(x => ({ tint: x.tint, miss: x.missChance })) }));

  const miss = await ev('window.__mm6Debug.simulateArcherMiss()');
  check('промах стрелы проверяется до формулы урона',
    miss && miss.missed && miss.after === miss.before, JSON.stringify(miss));
  await ev('window.__mm6Debug.closeBattle()');

  const ringHit = await ev(`(()=>{window.__mm6Debug.setDebugRng(0.04);
    window.__mm6State().lootCounters={}; return window.__mm6Debug.rollLootFor('soldier');})()`);
  const ringMiss = await ev(`(()=>{window.__mm6Debug.setDebugRng(0.06); return window.__mm6Debug.rollLootFor('soldier');})()`);
  check('кольцо с мыши падает с шансом 5% и остаётся на полу',
    ringHit.some(x => x.kind === 'item' && x.id === 'ring_1' && x.floor === true) &&
    !ringMiss.some(x => x.id === 'ring_1'), JSON.stringify({ hit: ringHit, miss: ringMiss }));

  const kings = await ev(`(()=>{const g=window.__mm6State(); g.lootCounters={}; window.__mm6Debug.setDebugRng(0.9);
    const first=window.__mm6Debug.rollLootFor('king');
    const repeat=window.__mm6Debug.rollLootFor('king');
    return {first,repeat};})()`);
  check('король: гарантированное кольцо/корона в первом гнезде и 25% позже',
    kings.first.some(x => x.kind === 'item' && ['ring_1', 'crown'].includes(x.id) && x.floor) &&
    !kings.repeat.some(x => ['ring_1', 'crown'].includes(x.id)), JSON.stringify(kings));
  await ev(`(()=>{window.__mm6State().debugRng=null;return true;})()`);

  const lairs = await ev(`({mouse:window.__mm6Debug.lairEnemies('mouse_nest'),
    spider:window.__mm6Debug.lairEnemies('spider_lair'),bone:window.__mm6Debug.lairEnemies('bone_yard')})`);
  check('шаблоны логовищ: мышиное гнездо с королём и кладами, пауки и костница',
    lairs.mouse.enemies.some(e => e.variantId === 'king') &&
    lairs.mouse.enemies.filter(e => e.variantId === 'wizard').length >= 1 &&
    lairs.mouse.enemies.filter(e => e.variantId === 'soldier').length >= 3 && lairs.mouse.chests === 2 &&
    lairs.spider.enemies.some(e => e.elite) && lairs.spider.chests >= 1 &&
    lairs.bone.enemies.some(e => e.leader) && lairs.bone.chests >= 1,
    JSON.stringify({ mouse: lairs.mouse.enemies.map(e => e.variantId), chests: {
      mouse: lairs.mouse.chests, spider: lairs.spider.chests, bone: lairs.bone.chests } }));

  const assets = await ev('window.__mm6Debug.monsterReport().asset');
  check('структура ассетов предложена без массового переименования',
    !!assets.groups && Object.keys(assets.groups).length >= 4 && /не создаются/.test(assets.note),
    JSON.stringify(assets));

  const limited = await ev(`(()=>{const specs=Array.from({length:20},()=>({id:'mouse',name:'Мышь',hp:20,
    atk:1,def:0,combatSpeed:1,acts:1,moveEvery:1,gold:[1,3]}));
    const b=window.__mm6Debug.startBattle(specs); return window.__mm6Debug.battleLimitReport();})()`);
  check('лишние враги становятся зрителями, а не активными юнитами',
    limited && limited.active === 12 && limited.spectators === 8 && limited.unitsAligned &&
    limited.budget >= 16 && limited.budget <= 80, JSON.stringify(limited));
  const reinforced = await ev('window.__mm6Debug.forceReinforcement()');
  check('подкрепление приходит с корректным индексом в b.units',
    reinforced && reinforced.ok && reinforced.active === 13 && reinforced.spectators === 7 && reinforced.unitsAligned,
    JSON.stringify(reinforced));

  const shopOk = await ev('window.__mm6Debug.shopReport()');
  check('отчёт лавки без ошибок после проверки лута', shopOk.ok, JSON.stringify(shopOk.errors));
  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `PROGRESSION P4 CHECKS FAILED (${failures})` : 'PROGRESSION P4 CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
