// CDP-проверка реального ввода в бою MM6: клик/тап по «фишке» действия и по врагу.
// Запуск: node scripts/cdp-mm6-battle-click.mjs
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
const debugPort = 9200 + Math.floor(Math.random() * 600);
const profile = await mkdtemp(join(tmpdir(), 'mm6-click-'));
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
  async function waitFor(expr, timeout = 6000) {
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
  async function tap(x, y) {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  async function clientOf(point) {
    const r = await ev(`(()=>{const r=document.getElementById('cv').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};})()`);
    const scale = Math.min(r.width / 640, r.height / 360);
    return { x: r.left + (r.width - 640 * scale) / 2 + point.x * scale,
      y: r.top + (r.height - 360 * scale) / 2 + point.y * scale };
  }
  const chipPoint = async id => clientOf(await ev(`(()=>{const r=window.__mm6Debug.battleInputReport().chips.find(c=>c.id==='${id}');return {x:r.x+r.w/2,y:r.y+r.h/2};})()`));
  const enemyPoint = async i => clientOf(await ev(`window.__mm6Debug.battleEnemyCanvasPoint(${i})`));
  const clickEnemy = async i => { const p = await enemyPoint(i); await click(p.x, p.y); };
  const clickChip = async id => { const p = await chipPoint(id); await click(p.x, p.y); };
  const tapChip = async id => { const p = await chipPoint(id); await tap(p.x, p.y); };
  const tapEnemy = async i => { const p = await enemyPoint(i); await tap(p.x, p.y); };
  const state = () => ev(`(()=>{const g=window.__mm6State(),b=g&&g.battle;if(!b)return null;
    return {hp:b.enemies.map(e=>Math.round(e.hp)),targetIdx:b.targetIdx,busy:b.busy,turn:b.turn,heroIdx:b.heroIdx,
      armed:window.__mm6Debug.battleInputReport().armed,mp:g.party.map(h=>Math.round(h.mp)),
      log:b.log.map(e=>e.text),toast:document.getElementById('toast').textContent};})()`);
  async function waitHero(heroIdx = null) {
    await waitFor(`(()=>{const b=window.__mm6State().battle;return !!b&&!b.end&&b.turn==='hero'&&!b.busy&&` +
      (heroIdx === null ? 'true' : `b.heroIdx===${heroIdx}`) + `;})()`);
  }
  async function setupBattle() {
    await ev(`(()=>{window.__mm6Debug.startGame('normal',[0,1,2]);
      const g=window.__mm6State();g.party.forEach(h=>{h.spells=['fire','shield'];h.mp=999;h.maxMp=999;h.hp=999;h.maxHp=999;});
      const mk=(name)=>({name,alive:true,hp:100000,maxHp:100000,atk:1,defVal:0,speed:1,def:{},gold:[0,0]});
      window.__mm6Debug.startBattle([mk('Враг A'),mk('Враг B')]);return true;})()`);
    await waitHero();
  }
  async function playWith(input) {
    await send('Page.navigate', { url: base + '/games/mm6/index.html' });
    await waitFor('!!window.__mm6Debug', 8000);
    const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    await input(play.x, play.y);
    await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
  }

  // --- PC: реальные клики мышью ---
  await playWith(click);
  await setupBattle();
  const layers = await ev(`(()=>{const p=(id)=>getComputedStyle(document.getElementById(id)).pointerEvents;
    return {overlay:getComputedStyle(document.getElementById('unified-launch')).display,
      controls:p('controls'),party:p('party'),toast:p('toast')};})()`);
  check('оверлей старта скрыт, слои не перехватывают клик',
    layers.overlay === 'none' && layers.controls === 'none' && layers.party === 'none' && layers.toast === 'none', JSON.stringify(layers));

  const s0 = await state();
  const atkChip = await chipPoint('attack');
  const elAtChip = await ev(`(()=>{const n=document.elementFromPoint(${atkChip.x},${atkChip.y});return n?(n.id||n.tagName):null;})()`);
  check('фишка «Атака» доступна canvas', elAtChip === 'cv', String(elAtChip));

  // Без цели атака только просит выбрать врага.
  await clickChip('attack');
  const s1 = await state();
  check('без цели атака ждёт выбора и не бьёт',
    !!s1.armed && s1.armed.kind === 'attack' && s1.hp[1] === s0.hp[1] && /Выберите цель/.test(s1.toast),
    JSON.stringify({ armed: s1.armed, hp: s1.hp, toast: s1.toast }));

  // Выбор цели сам по себе не наносит урона и не тратит ману.
  await clickEnemy(1);
  const s2 = await state();
  check('клик по врагу выбирает цель, но не атакует',
    s2.targetIdx === 1 && !s2.armed && s2.hp[1] === s1.hp[1] && s2.mp[s2.heroIdx] === s1.mp[s1.heroIdx],
    JSON.stringify({ target: s2.targetIdx, hp: s2.hp, mp: s2.mp }));

  // Ключевой сценарий: атака по уже выбранной цели бьёт без второго клика по врагу.
  await clickChip('attack');
  const s3 = await state();
  check('атака по выбранной цели бьёт без повторного клика',
    s3.targetIdx === 1 && !s3.armed && s3.hp[1] < s2.hp[1] && s3.log.some(t => /ударил|ударила/.test(t)),
    JSON.stringify({ target: s3.targetIdx, hp: s3.hp, armed: s3.armed }));

  await waitHero();
  const beforeSwitch = await state();
  await clickEnemy(0);
  const afterSwitch = await state();
  check('клик по другому врагу только переключает цель',
    afterSwitch.targetIdx === 0 && afterSwitch.hp.every((hp, i) => hp === beforeSwitch.hp[i]) &&
    afterSwitch.mp[afterSwitch.heroIdx] === beforeSwitch.mp[beforeSwitch.heroIdx],
    JSON.stringify({ target: afterSwitch.targetIdx, hp: afterSwitch.hp, mp: afterSwitch.mp }));

  await waitHero();
  await clickChip('spell');
  check('фишка «Магия» открывает меню', await ev(`!document.getElementById('spellMenu').classList.contains('hidden')`));
  const spellBtn = await ev(`(()=>{const b=document.querySelector('#spellList button[data-spell="fire"]');if(!b)return null;const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  check('кнопка огненного шара доступна', !!spellBtn, JSON.stringify(spellBtn));
  const beforeSpell = await state();
  await click(spellBtn.x, spellBtn.y);
  const cast = await state();
  check('целевая магия по выбранной цели срабатывает сразу',
    !cast.armed && cast.hp[0] < beforeSpell.hp[0] && cast.mp[cast.heroIdx] < beforeSpell.mp[beforeSpell.heroIdx] &&
    cast.log.some(t => /применяет/.test(t)) &&
    await ev(`document.getElementById('spellMenu').classList.contains('hidden')`),
    JSON.stringify({ hp: cast.hp, mp: cast.mp }));

  await waitHero();
  const beforeMpSwitch = await state();
  await clickEnemy(1);
  const mpSwitch = await state();
  check('смена цели кликом не расходует ману',
    mpSwitch.targetIdx === 1 && mpSwitch.mp[mpSwitch.heroIdx] === beforeMpSwitch.mp[beforeMpSwitch.heroIdx] &&
    mpSwitch.hp.every((hp, i) => hp === beforeMpSwitch.hp[i]),
    JSON.stringify({ target: mpSwitch.targetIdx, mp: mpSwitch.mp }));

  await clickChip('spell');
  const shieldBtn = await ev(`(()=>{const b=document.querySelector('#spellList button[data-spell="shield"]');const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(shieldBtn.x, shieldBtn.y);
  const selfSpell = await state();
  check('заклинание на себя применяется без выбора цели',
    !selfSpell.armed && selfSpell.log.some(t => /щит/.test(t)), JSON.stringify({ armed: selfSpell.armed }));

  await waitHero();
  const beforeArrows = await state();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
  const afterArrows = await state();
  check('стрелки переключают цель и сохраняют её между ходами',
    afterArrows.targetIdx !== beforeArrows.targetIdx && !afterArrows.armed,
    JSON.stringify({ from: beforeArrows.targetIdx, to: afterArrows.targetIdx }));

  const beforeSpace = await state();
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 });
  const afterSpace = await state();
  check('пробел бьёт по выбранной цели без клика по ней',
    afterSpace.hp[afterArrows.targetIdx] < beforeSpace.hp[afterArrows.targetIdx],
    JSON.stringify({ target: afterArrows.targetIdx, hp: afterSpace.hp }));

  // --- Мобильный тап: выбор цели и удар по ней отдельными действиями ---
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await playWith(tap);
  await setupBattle();
  const m0 = await state();
  await tapChip('attack');
  await tapEnemy(0);
  const m1 = await state();
  await tapChip('attack');
  const m2 = await state();
  check('тап выбирает цель, а повторный тап по «Атаке» бьёт по ней',
    m1.targetIdx === 0 && m1.hp[0] === m0.hp[0] && !m2.armed && m2.targetIdx === 0 && m2.hp[0] < m0.hp[0],
    JSON.stringify({ target: m2.targetIdx, hp: m2.hp, armed: m2.armed }));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `BATTLE CLICK CHECKS FAILED (${failures})` : 'BATTLE CLICK CHECKS PASSED');
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
