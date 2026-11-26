// CDP-проверка третьей части: выбор цели сохраняется, атака/магия бьют по выбранной цели сразу.
// Запуск: node scripts/cdp-mm6-ui-p3.mjs
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
const debugPort = 9800 + Math.floor(Math.random() * 500);
const profile = await mkdtemp(join(tmpdir(), 'mm6-ui-p3-'));
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
  async function click(x, y) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  async function key(k, code, vk) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  }
  async function clientOf(point) {
    const r = await ev(`(()=>{const r=document.getElementById('cv').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};})()`);
    const scale = Math.min(r.width / 640, r.height / 360);
    return { x: r.left + (r.width - 640 * scale) / 2 + point.x * scale,
      y: r.top + (r.height - 360 * scale) / 2 + point.y * scale };
  }
  const clickEnemy = async i => {
    const p = await clientOf(await ev(`window.__mm6Debug.battleEnemyCanvasPoint(${i})`));
    await click(p.x, p.y);
  };
  const clickChip = async id => {
    const p = await clientOf(await ev(`(()=>{const r=window.__mm6Debug.battleInputReport().chips.find(c=>c.id==='${id}');return {x:r.x+r.w/2,y:r.y+r.h/2};})()`));
    await click(p.x, p.y);
  };
  const state = () => ev(`(()=>{const g=window.__mm6State(),b=g&&g.battle;if(!b)return null;
    return {hp:b.enemies.map(e=>Math.round(e.hp)),alive:b.enemies.map(e=>!!e.alive),
      targetIdx:b.targetIdx,heroIdx:b.heroIdx,turn:b.turn,busy:b.busy,
      armed:window.__mm6Debug.battleInputReport().armed,mp:g.party.map(h=>Math.round(h.mp)),
      log:b.log.map(e=>e.text),toast:document.getElementById('toast').textContent};})()`);
  const setupBattle = async names => {
    await ev(`(()=>{const g=window.__mm6State();g.battle=null;
      g.party.forEach(h=>{h.spells=['fire','shield'];h.mp=999;h.maxMp=999;h.hp=999;h.maxHp=999;});
      const list=${JSON.stringify(names)}.map(name=>({name,alive:true,hp:100000,maxHp:100000,atk:1,defVal:0,speed:1,def:{},gold:[0,0]}));
      window.__mm6Debug.startBattle(list);return true;})()`);
    await waitFor(`(()=>{const b=window.__mm6State().battle;return !!b&&b.turn==='hero'&&!b.busy;})()`);
  };

  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 8000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
  check('игра запущена реальным кликом', await ev(`!!window.__mm6State()`));

  // Один враг — цель выбирается сама.
  await setupBattle(['Одинокий Враг']);
  let s = await state();
  check('один враг получает цель автоматически', s.targetIdx === 0, JSON.stringify(s.targetIdx));

  // Несколько врагов — цели нет, пока игрок её не укажет.
  await setupBattle(['Враг A', 'Враг B']);
  s = await state();
  check('при нескольких врагах цель не выбрана', s.targetIdx === -1, JSON.stringify(s.targetIdx));
  const beforeBlind = await state();
  await key(' ', 'Space', 32);
  let blind = await state();
  check('пробел без цели просит выбрать её и не бьёт',
    /Выберите цель/.test(blind.toast) && blind.hp.every((hp, i) => hp === beforeBlind.hp[i]),
    JSON.stringify({ toast: blind.toast, hp: blind.hp }));

  // Выбор цели и сохранение её между ходами.
  const firstHero = s.heroIdx;
  await clickEnemy(1);
  const selected = await state();
  // Обычное действие переводит ход дальше; цель должна пережить смену героя.
  await ev(`window.__mm6Debug.castSpell('shield')`);
  await waitFor(`(()=>{const b=window.__mm6State().battle;return !!b&&b.turn==='hero'&&!b.busy&&b.heroIdx!==${firstHero};})()`);
  const nextHero = await state();
  check('выбранная цель сохраняется между ходами',
    selected.targetIdx === 1 && nextHero.targetIdx === 1,
    JSON.stringify({ from: firstHero, to: nextHero.heroIdx, target: nextHero.targetIdx }));

  // Атака по выбранной цели — без второго клика по врагу.
  const beforeAttack = await state();
  await clickChip('attack');
  const attacked = await state();
  check('атака по выбранной цели бьёт без повторного клика',
    attacked.hp[1] < beforeAttack.hp[1] && !attacked.armed,
    JSON.stringify({ target: attacked.targetIdx, hp: attacked.hp, armed: attacked.armed }));

  await waitFor(`(()=>{const b=window.__mm6State().battle;return !!b&&b.turn==='hero'&&!b.busy;})()`);
  // Целевая магия по выбранной цели тратит ману один раз и срабатывает сразу.
  const beforeSpell = await state();
  await clickChip('spell');
  await waitFor(`!document.getElementById('spellMenu').classList.contains('hidden')`);
  const btn = await ev(`(()=>{const b=document.querySelector('#spellList button[data-spell="fire"]');const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(btn.x, btn.y);
  const casted = await state();
  check('целевая магия по выбранной цели срабатывает сразу',
    casted.hp[1] < beforeSpell.hp[1] && casted.mp[casted.heroIdx] < beforeSpell.mp[beforeSpell.heroIdx] && !casted.armed,
    JSON.stringify({ hp: casted.hp, mp: casted.mp }));

  // Клик по другому врагу только меняет цель: мана не расходуется.
  const beforeSwitch = await state();
  await clickEnemy(0);
  const switched = await state();
  check('клик по другому врагу переключает цель без траты маны',
    switched.targetIdx === 0 && switched.mp[switched.heroIdx] === beforeSwitch.mp[beforeSwitch.heroIdx] &&
    switched.hp.every((hp, i) => hp === beforeSwitch.hp[i]),
    JSON.stringify({ target: switched.targetIdx, mp: switched.mp, hp: switched.hp }));

  // После гибели цели при двух живых врагах снова нужен выбор.
  await ev(`(()=>{const b=window.__mm6State().battle;
    b.enemies.push({name:'Третий',alive:true,hp:100000,maxHp:100000,atk:1,defVal:0,speed:1,def:{},gold:[0,0]});
    b.enemies[b.targetIdx].hp=1;return true;})()`);
  await clickChip('attack');
  const killed = await state();
  check('после гибели цели при нескольких врагах выбор требуется снова',
    killed.targetIdx === -1 && killed.alive.filter(Boolean).length === 2,
    JSON.stringify({ target: killed.targetIdx, hp: killed.hp }));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `UI PART 3 CHECKS FAILED (${failures})` : 'UI PART 3 CHECKS PASSED');
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
