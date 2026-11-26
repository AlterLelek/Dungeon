// CDP-проверка пятой части: экипировка двуручного отравленного топора не накладывает эффекты.
// Запуск: node scripts/cdp-mm6-ui-p5.mjs
// Нужен Chrome; путь можно задать через CHROME_PATH.
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
const debugPort = 9300 + Math.floor(Math.random() * 200);
const profile = await mkdtemp(join(tmpdir(), 'mm6-ui-p5-'));
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
  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  }
  async function waitFor(expr, timeout = 8000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await ev(expr)) return true;
      await sleep(60);
    }
    throw new Error('таймаут: ' + expr);
  }
  async function key(k, code, vk) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  }
  const snapshot = () => ev(`(()=>{const g=window.__mm6State(),stats=window.__mm6Debug.statsReport();
    return {party:g.party.map((h,i)=>({hp:Math.round(h.hp),mp:Math.round(h.mp),poison:h.poison||0,
      poisonTurns:h.poisonTurns||0,statuses:(h.statuses||[]).map(s=>s.id||s),
      weapon:h.equip&&h.equip.weapon||null,shield:h.equip&&h.equip.shield||null,
      attack:stats[i].attack,defense:stats[i].defense})),
      gold:g.gold,battle:!!g.battle,toast:document.getElementById('toast').textContent};})()`);
  const battleState = () => ev(`(()=>{const g=window.__mm6State(),b=g.battle,h=g.party[b.heroIdx];
    return {hero:{hp:Math.round(h.hp),mp:Math.round(h.mp),poison:h.poison||0,
      poisonTurns:h.poisonTurns||0,statuses:(h.statuses||[]).map(s=>s.id||s)},
      enemies:b.enemies.map(e=>({name:e.name,hp:Math.round(e.hp),poison:e.poison||0,
        defVal:e.defVal,stun:e.stun||0,slow:e.slow||0})),
      log:b.log.map(e=>e.text),weapon:h.equip&&h.equip.weapon||null};})()`);

  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 8000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: play.x, y: play.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: play.x, y: play.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: play.x, y: play.y, button: 'left', clickCount: 1 });
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
  check('игра запущена реальным кликом', await ev(`!!window.__mm6State()`));

  // Кладём в сумку двуручный топор с ядовитым чарованием и щит для проверки занятых рук.
  await ev(`(()=>{const g=window.__mm6State();g.invHero=0;
    g.bag.push({uid:'p5-shield',type:'armor',slot:'shield',name:'Тестовый щит',dmg:0,def:1,
      cost:1,sell:1,quality:1,set:'any',reforges:0,enchant:null,icon:'🛡'});
    g.bag.push({uid:'p5-axe',type:'weapon',name:'Двуручный топор яда',dmg:8,baseDmg:8,
      cost:12,sell:6,quality:1,wkind:'axe',two_handed:true,set:'any',reforges:0,
      enchant:{id:'liquid_poison',stat:'poison',value:3,color:'#4ade80'},icon:'🪓'});
    return true;})()`);
  await ev(`window.__mm6Debug.equipByUid('p5-shield','shield')`);
  const before = await snapshot();
  const equipped = await ev(`window.__mm6Debug.equipByUid('p5-axe','weapon')`);
  const after = await snapshot();
  check('двуручный топор реально надет, щит снят',
    equipped && after.party[0].weapon === 'p5-axe' && after.party[0].shield === null &&
    before.party[0].shield === 'p5-shield',
    JSON.stringify({ equipped, before: before.party[0].shield, after: after.party[0] }));

  const unchanged = ['hp', 'mp', 'poison', 'poisonTurns', 'statuses'].every(k =>
    JSON.stringify(after.party[0][k]) === JSON.stringify(before.party[0][k]));
  check('экипировка не меняет HP/MP/статусы/яд героя', unchanged,
    JSON.stringify({ before: before.party[0], after: after.party[0] }));
  check('экипировка не наносит урон и не трогает золото',
    after.gold === before.gold && after.party.every((h, i) => h.hp === before.party[i].hp) && !after.battle,
    JSON.stringify({ gold: [before.gold, after.gold], hp: after.party.map(h => h.hp), battle: after.battle }));
  check('чарование яда не меняет итоговую защиту героя',
    after.party[0].defense === before.party[0].defense,
    JSON.stringify({ before: before.party[0].defense, after: after.party[0].defense }));

  // Удар: эффект оружия должен появиться только здесь и только на цели.
  await ev(`(()=>{const list=['Цель A','Цель B'].map(name=>({name,alive:true,hp:100000,maxHp:100000,
    atk:1,defVal:2,speed:1,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);
    const b=window.__mm6State().battle;b.targetIdx=0;b.heroIdx=0;b.turn='hero';b.busy=false;return true;})()`);
  await waitFor(`(()=>{const b=window.__mm6State().battle;return !!b&&b.turn==='hero'&&!b.busy;})()`);
  const beforeHit = await battleState();
  await key(' ', 'Space', 32);
  const afterHit = await battleState();
  check('удар наносит урон и применяет яд только по выбранной цели',
    afterHit.enemies[0].hp < beforeHit.enemies[0].hp && afterHit.enemies[0].poison === 3 &&
    afterHit.enemies[1].hp === beforeHit.enemies[1].hp && afterHit.enemies[1].poison === 0 &&
    afterHit.log.some(t => /Яд: .* отравлен/.test(t)),
    JSON.stringify({ before: beforeHit.enemies, after: afterHit.enemies }));
  check('после удара герой не получает яд/статусы/дебаффы',
    afterHit.hero.hp === beforeHit.hero.hp && afterHit.hero.poison === 0 &&
    afterHit.hero.statuses.length === beforeHit.hero.statuses.length &&
    afterHit.enemies[0].defVal === beforeHit.enemies[0].defVal,
    JSON.stringify({ hero: afterHit.hero, def: [beforeHit.enemies[0].defVal, afterHit.enemies[0].defVal] }));
  check('причиной урона в журнале указан топор',
    afterHit.log.some(t => /Двуручный топор/.test(t)), JSON.stringify(afterHit.log.slice(-2)));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `UI PART 5 CHECKS FAILED (${failures})` : 'UI PART 5 CHECKS PASSED');
  ws.close();
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
