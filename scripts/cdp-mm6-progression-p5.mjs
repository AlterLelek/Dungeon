// CDP-проверка части 5: гранаты,friendly fire и церковная десятина.
// Запуск: node scripts/cdp-mm6-progression-p5.mjs
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
const debugPort = 9780 + Math.floor(Math.random() * 120);
const profile = await mkdtemp(join(tmpdir(), 'mm6-progression-p5-'));
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

  const report = await ev('window.__mm6Debug.grenadeReport()');
  check('шесть гранат с точным уроном, эффекты и FF 50%', report.ok,
    JSON.stringify({ ok: report.ok, errors: report.errors, ff: report.ffRatio }));
  check('урон гранат 25/45/55/60/70/120',
    ['smoke', 'frost', 'acid', 'lava', 'dark', 'holy'].every((id, i) =>
      report.grenades[id] && report.grenades[id].damage === [25, 45, 55, 60, 70, 120][i]),
    JSON.stringify(report.items));

  const start = await ev(`(()=>{const specs=Array.from({length:4},(_,i)=>({id:'skeleton',name:'Скелет '+i,hp:500,alive:true,\n    atk:1,def:0,combatSpeed:1,acts:1,moveEvery:1,gold:[0,0]}));\n    const b=window.__mm6Debug.startBattle(specs);\n    return window.__mm6State().battle.enemies.map(e=>({hp:e.hp,alive:e.alive}));})()`);
  check('бой подготовлен', start.length === 4, JSON.stringify(start));

  const holy = await ev(`(()=>{const g=window.__mm6State(); const e=g.battle.enemies[0];\n    const before=e.hp; const profile=window.__mm6Debug.grenadeTargetProfile(e);\n    window.__mm6Debug.throwGrenade('holy',0);\n    return {before,after:e.hp,profile,damage:before-e.hp};})()`);
  check('святая граната наносит ×2.5 по нежити/дьяволу',
    holy.profile.undead && holy.damage === 300, JSON.stringify(holy));

  const frost = await ev(`(()=>{const e=window.__mm6State().battle.enemies[1];\n    const before=e.hp; window.__mm6Debug.throwGrenade('frost',1);\n    return {before,after:e.hp,damage:before-e.hp,stun:e.stun};})()`);
  check('морозная граната пропускает ход цели', frost.damage === 45 && frost.stun >= 1, JSON.stringify(frost));
  await ev('window.__mm6Debug.closeBattle()');
  check('бой закрыт перед проверкой FF', !(await ev('!!window.__mm6State().battle')), '');

  const effects = await ev(`(()=>{const specs=Array.from({length:4},(_,i)=>({id:'skeleton',name:'Скелет '+i,hp:600,\n    atk:1,def:0,combatSpeed:1,acts:1,moveEvery:1,gold:[0,0],alive:true}));\n    window.__mm6Debug.startBattle(specs);\n    const g=window.__mm6State(), b=g.battle;\n    b.aggro=5; b.enemies[0].aggro=3;\n    const smokeBefore=b.enemies[0].hp;\n    window.__mm6Debug.throwGrenade('smoke',0);\n    const smoke={aggro:b.aggro,enemyAggro:b.enemies[0].aggro,damage:smokeBefore-b.enemies[0].hp};\n    g.floorLoot=[{id:'ring_1',name:'Кольцо',map:g.world.current,taken:false,spoiled:false}];\n    const acidBefore=b.enemies[1].hp;\n    window.__mm6Debug.throwGrenade('acid',1);\n    const acid={damage:acidBefore-b.enemies[1].hp,poison:b.enemies[1].poison,\n      acidTurns:b.enemies[1].acidTurns,spoiled:g.floorLoot[0].spoiled};\n    const lavaBefore=b.enemies.map(e=>e.hp);\n    window.__mm6Debug.throwGrenade('lava',2);\n    const lava={damage:lavaBefore.map((hp,i)=>hp-b.enemies[i].hp),floorBurn:b.floorBurn};\n    const hi=b.heroIdx||0;\n    const skillBefore=(g.party[hi].skillXp||{}).throwing||0;\n    window.__mm6Debug.setSkillCooldown(hi,'throwing',0);\n    const thrown=window.__mm6Debug.throwGrenade('smoke',3);\n    const skillAfter=(g.party[hi].skillXp||{}).throwing||0;\n    return {smoke,acid,lava,skillBefore,skillAfter,thrown,heroIdx:hi};})()`);
  check('дым снимает агро, кислота портит лут, лава жжёт всех и пол',
    effects.smoke.aggro === 0 && effects.smoke.enemyAggro === 0 && effects.smoke.damage === 25 &&
    effects.acid.damage === 55 && effects.acid.poison >= 5 && effects.acid.acidTurns === 3 && effects.acid.spoiled &&
    effects.lava.damage.every(n => n === 60) && effects.lava.floorBurn === 3, JSON.stringify(effects));
  check('метание растёт только от броска гранаты', effects.skillAfter > effects.skillBefore,
    JSON.stringify({ before: effects.skillBefore, after: effects.skillAfter }));
  await ev('window.__mm6Debug.closeBattle()');

  const ff = await ev(`(()=>{const specs=Array.from({length:4},(_,i)=>({id:'mouse',name:'Мышь '+i,hp:600,maxHp:600,alive:true,\n    atk:1,def:0,combatSpeed:1,acts:1,moveEvery:1,gold:[0,0]}));\n    const started=window.__mm6Debug.startBattle(specs);\n    const g=window.__mm6State(); if(!g.battle) return {started,error:'battle null'};\n    const heroes=g.party.slice();\n    heroes.forEach(h=>{h.hp=h.maxHp;});\n    const before=heroes.map(h=>h.hp);\n    const enemyBefore=g.battle.enemies[0].hp;\n    window.__mm6Debug.throwGrenade('dark',0);\n    const g2=window.__mm6State();\n    return {before,after:g2.party.map(h=>h.hp),enemyBefore,enemyAfter:g2.battle.enemies[0].hp,\n      counts:g2.party.map((h,i)=>before[i]-h.hp)};})()`);
  check('тёмная граната: FF ровно 50% по каждому союзнику рядом',
    ff.counts.length >= 3 && ff.counts.every(n => n === 35) &&
    ff.enemyBefore - ff.enemyAfter === 70, JSON.stringify(ff));
  await ev('window.__mm6Debug.closeBattle()');

  const church = await ev('window.__mm6Debug.churchReport()');
  check('десятина: минимум 10 и 10% от золота', church.ok, JSON.stringify(church));
  check('церковь добавлена как здание и лавка', church.hasChurch,
    JSON.stringify({ hasChurch: church.hasChurch }));
  const resurrection = await ev(`(()=>{const g=window.__mm6State();\n    window.__mm6Debug.setPartyGold(500); window.__mm6Debug.setHeroHp(0,0);\n    g.shopOpen=true; g.shopType='church';\n    const before=g.gold; const hp=g.party[0].hp; const tithe=window.__mm6Debug.churchTithe();\n    const ok=window.__mm6Debug.resurrectAtChurch();\n    const g2=window.__mm6State();\n    return {ok,before,after:g2.gold,tithe,hpBefore:hp,hpAfter:g2.party[0].hp};})()`);
  check('воскрешение списывает десятину и возвращает героя в строй',
    resurrection.ok && resurrection.tithe === 50 && resurrection.before - resurrection.after === 50 &&
    resurrection.hpBefore === 0 && resurrection.hpAfter > 0, JSON.stringify(resurrection));

  const shopOk = await ev('window.__mm6Debug.shopReport()');
  check('отчёт лавки без ошибок', shopOk.ok, JSON.stringify(shopOk.errors));
  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `PROGRESSION P5 CHECKS FAILED (${failures})` : 'PROGRESSION P5 CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
