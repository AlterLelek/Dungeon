// CDP-проверка части 2: опыт за убийство, уровни, квестовый XP и тренер в гостинице.
// Запуск: node scripts/cdp-mm6-progression-p2.mjs
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
const debugPort = 9720 + Math.floor(Math.random() * 160);
const profile = await mkdtemp(join(tmpdir(), 'mm6-progression-p2-'));
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

  const start = await ev('window.__mm6Debug.progressionState()');
  check('герои начинают с 1 уровня и 50 XP до следующего',
    start.version === 2 && start.heroes.length === 3 && start.heroes.every(h => h.level === 1 && h.toNext === 50),
    JSON.stringify(start));

  // Опыт не начисляется при бегстве, но начисляется после победы всем, включая мёртвого.
  await ev(`window.__mm6State().party[1].hp=0`);
  const fled = await ev(`window.__mm6Debug.simulateKill({id:'mouse',name:'Мышь',hp:20,atk:1,def:0,combatSpeed:1,acts:1,moveEvery:1,gold:[1,3]},false)`);
  check('сбежал — не поумнел: опыт не начислен', fled.pending === 25 &&
    fled.after.every((v, i) => v === fled.before[i]) && fled.state.pendingXp === 0,
    JSON.stringify({ pending: fled.pending, before: fled.before, after: fled.after }));

  await ev(`window.__mm6State().party[1].hp=0`);
  const won = await ev(`window.__mm6Debug.simulateKill({id:'mouse',name:'Мышь',hp:20,atk:1,def:0,combatSpeed:1,acts:1,moveEvery:1,gold:[1,3]},true)`);
  check('победа: мышь даёт 25 XP каждому, включая мёртвого героя',
    won.pending === 25 && won.after.every((v, i) => v === won.before[i] + 25) && won.state.pendingXp === 0,
    JSON.stringify({ pending: won.pending, before: won.before, after: won.after }));

  // Квестовый XP не режется затуханием даже на высоком уровне.
  const quest = await ev(`(()=>{const g=window.__mm6State(); g.party.forEach(h=>h.level=10);
    const before=g.party.map(h=>Math.floor(h.exp||0)); const r=window.__mm6Debug.grantQuestXp(25);
    return {before,after:g.party.map(h=>Math.floor(h.exp||0)),gained:r.gained};})()`);
  check('квестовый XP не уменьшается разницей уровней',
    quest.gained === 25 && quest.after.every((v, i) => v === quest.before[i] + 25), JSON.stringify(quest));

  const hudState = await ev(`window.__mm6Debug.progressionState()`);
  const hud = await ev(`document.querySelector('#party .pcard').textContent`);
  check('в UI показаны уровень и «до следующего»',
    hud.includes('Уровень ' + hudState.heroes[0].level) &&
    hud.includes('до следующего: ' + hudState.heroes[0].toNext), hud.slice(0, 200));

  // Тренер: только в гостинице, за золото и отдых; level=2 стоит 50 XP и 40 монет.
  await ev(`(()=>{const g=window.__mm6State(); g.party.forEach(h=>h.level=1);
    window.__mm6Debug.setHeroExp(0,50); window.__mm6Debug.setPartyGold(1000);
    g.clockMinutes=8*60; g.party.forEach(h=>{h.hp=1;h.mp=1;});
    return window.__mm6Debug.forceShop('inn').ok;})()`);
  const beforeTrain = await ev(`(()=>{const g=window.__mm6State(); return {state:window.__mm6Debug.progressionState(),
    maxHp:g.party[0].maxHp,maxMp:g.party[0].maxMp};})()`);
  const btn = await ev(`(()=>{const b=Array.from(document.querySelectorAll('#shopList button.act'))
    .find(x=>/повысить/.test(x.textContent||'')&&!x.disabled);
    if(!b) return null; b.click(); return b.textContent.trim();})()`);
  const afterTrain = await ev(`(()=>{const g=window.__mm6State(); const r=window.__mm6Debug.progressionState();
    return {gold:g.gold,clock:g.clockMinutes,hp:g.party[0].hp,mp:g.party[0].mp,
      level:r.heroes[0].level,toNext:r.heroes[0].toNext};})()`);
  check('тренер повышает уровень за золото и отдых',
    !!btn && beforeTrain.state.heroes[0].exp >= 50 && afterTrain.level === 2 && afterTrain.gold === 960 &&
    afterTrain.clock === 16 * 60 && afterTrain.hp === beforeTrain.maxHp && afterTrain.mp === beforeTrain.maxMp &&
    afterTrain.toNext === 100,
    JSON.stringify({ btn, beforeTrain: beforeTrain.state.heroes[0], afterTrain }));

  const noXp = await ev(`(()=>{const g=window.__mm6State(); window.__mm6Debug.setHeroExp(0,0);
    const before=g.gold; const out=window.__mm6Debug.trainLevel(0);
    return {ok:out.ok,goldSame:g.gold===before,level:out.state.heroes[0].level};})()`);
  check('без XP тренер не повышает уровень и не берёт золото',
    !noXp.ok && noXp.goldSame && noXp.level === 2, JSON.stringify(noXp));

  const shopOk = await ev(`window.__mm6Debug.shopReport()`);
  check('отчёт лавки без ошибок после добавления тренера', shopOk.ok, JSON.stringify(shopOk.errors));
  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `PROGRESSION P2 CHECKS FAILED (${failures})` : 'PROGRESSION P2 CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
