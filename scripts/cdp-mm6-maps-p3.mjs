// CDP-проверка третьей части новой задачи: размеры карт, миникарта 30×30 и большая карта.
// Запуск: node scripts/cdp-mm6-maps-p3.mjs
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
const debugPort = 9700 + Math.floor(Math.random() * 200);
const profile = await mkdtemp(join(tmpdir(), 'mm6-maps-p3-'));
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
    const params = { key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: k };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...params });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
  }
  const report = () => ev(`window.__mm6Debug.mapReport()`);
  const toast = () => ev(`document.getElementById('toast').textContent`);
  const player = () => ev(`(()=>{const p=window.__mm6State().player;return {x:p.x,y:p.y};})()`);

  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 10000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);

  const sizes = (await report()).sizes;
  check('размеры карт выбираются из пресетов 30/60/100',
    sizes.length >= 3 && sizes.every(s => [30, 60, 100].includes(s)) &&
    [30, 60, 100].every(s => sizes.includes(s)), JSON.stringify(sizes));

  // Переходим на карту 100×100 и детерминируем туман войны вокруг героя.
  await ev(`(()=>{const g=window.__mm6State(),i=g.world.maps.findIndex(m=>m.size===100);
    g.world.current=i;const m=g.world.maps[i],c=Math.floor(m.size/2);
    Object.assign(g.player,{x:c,y:c,px:c,py:c,fromX:c,fromY:c,moveT:0,dir:0});
    m.seen=new Set();
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)m.seen.add((c+dx)+','+(c+dy));
    window.__mm6Debug.drawMapNow();return true;})()`);
  await sleep(120);
  const big = await report();
  check('миникарта показывает окно 30×30 на карте 100×100',
    big.current === 100 && big.view === 30 && big.rect.w === 112 && big.origin.x > 0 && big.origin.y > 0 && big.ok,
    JSON.stringify({ current: big.current, view: big.view, rect: big.rect, origin: big.origin, errors: big.errors }));

  async function minimapPoint(x, y) {
    return ev(`(()=>{const cv=document.getElementById('cv').getBoundingClientRect(),r=window.__mm6Debug.mapReport().rect,
      o=window.__mm6Debug.mapReport().origin;
      const px=r.x+(${x}-o.x+.5)*r.w/30, py=r.y+(${y}-o.y+.5)*r.h/30;
      return {x:cv.left+px*cv.width/640,y:cv.top+py*cv.height/360};})()`);
  }
  const center = Math.floor(big.current / 2);
  const beforeSeen = await player();
  const seenPoint = await minimapPoint(center + 1, center);
  await click(seenPoint.x, seenPoint.y);
  const seenHint = (await report()).hint;
  check('клик по разведанной клетке миникарты показывает тип без перемещения',
    seenHint && seenHint.x === center + 1 && seenHint.y === center &&
    seenHint.title !== 'Неразведанная клетка' && JSON.stringify(await player()) === JSON.stringify(beforeSeen) &&
    (await toast()).includes(seenHint.title), JSON.stringify({ hint: seenHint, toast: await toast(), player: await player() }));

  const unseenX = big.origin.x + 2, unseenY = big.origin.y + 2;
  const unseenPoint = await minimapPoint(unseenX, unseenY);
  await click(unseenPoint.x, unseenPoint.y);
  const unseenHint = (await report()).hint;
  check('неразведанные клетки скрыты туманом войны',
    unseenHint && unseenHint.x === unseenX && unseenHint.y === unseenY &&
    unseenHint.title === 'Неразведанная клетка' && JSON.stringify(await player()) === JSON.stringify(beforeSeen),
    JSON.stringify({ hint: unseenHint, player: await player() }));

  const openPoint = await ev(`(()=>{const cv=document.getElementById('cv').getBoundingClientRect(),r=window.__mm6Debug.mapReport().rect;
    return {x:cv.left+(r.x+r.w/2)*cv.width/640,y:cv.top+(r.y+r.h+24)*cv.height/360};})()`);
  await click(openPoint.x, openPoint.y);
  const fromMinimap = await ev(`({open:!!window.__mm6State().mapOpen,
    title:document.getElementById('bigMapTitle').textContent})`);
  check('ссылка под миникартой открывает карту всего мира',
    fromMinimap.open && fromMinimap.title.includes('Весь мир'), JSON.stringify(fromMinimap));
  await ev('window.__mm6Debug.toggleBigMap(false)');

  await key('m', 'KeyM', 77);
  const opened = await ev(`({open:!!window.__mm6State().mapOpen,hidden:document.getElementById('bigMap').classList.contains('hidden'),
    title:document.getElementById('bigMapTitle').textContent})`);
  check('M открывает большую карту', opened.open && !opened.hidden && opened.title.includes('Весь мир'), JSON.stringify(opened));

  // Большая карта теперь показывает весь мир: клик попадает в локацию, а не в клетку 100×100.
  const location = await ev(`(()=>{const g=window.__mm6State(),m=g.world.maps[g.world.current],
    geo=window.__mm6Debug.worldMapReport().geometry,s=m.slot,r=document.getElementById('bigMapCanvas').getBoundingClientRect();
    return {x:r.left+(geo.ox+s.gx*geo.cell+geo.cell/2)*r.width/640,
      y:r.top+(geo.oy+s.gy*geo.cell+geo.cell/2)*r.height/640,index:m.index,name:m.settlement&&m.settlement.name};})()`);
  await click(location.x, location.y);
  const bigHint = (await report()).hint;
  check('клик по большой карте показывает локацию без перемещения',
    bigHint && bigHint.index === location.index && bigHint.title === location.name &&
    JSON.stringify(await player()) === JSON.stringify(beforeSeen),
    JSON.stringify({ hint: bigHint, location, player: await player() }));

  await key('ь', 'KeyM', 77);
  check('Ь закрывает большую карту',
    await ev(`!window.__mm6State().mapOpen && document.getElementById('bigMap').classList.contains('hidden')`));

  // Туман войны явно сохраняется в сейве и восстанавливается после загрузки.
  const fogBefore = (await report()).fog;
  const saved = await ev(`window.__mm6Debug.saveWorld()`);
  const loaded = await ev(`window.__mm6Debug.loadWorld()`);
  const fogAfter = (await report()).fog;
  check('туман войны сохраняется в сейве',
    saved && loaded && JSON.stringify(fogBefore) === JSON.stringify(fogAfter) && (await report()).ok,
    JSON.stringify({ before: fogBefore, after: fogAfter }));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `MAPS PART 3 CHECKS FAILED (${failures})` : 'MAPS PART 3 CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
