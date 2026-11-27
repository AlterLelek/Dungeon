// CDP-проверка четвёртой части: панели врагов на карте и итоговые Атака/Защита.
// Запуск: node scripts/cdp-mm6-ui-p4.mjs
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
const debugPort = 9500 + Math.floor(Math.random() * 300);
const profile = await mkdtemp(join(tmpdir(), 'mm6-ui-p4-'));
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
  async function clientOf(point) {
    const r = await ev(`(()=>{const r=document.getElementById('cv').getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};})()`);
    const scale = Math.min(r.width / 640, r.height / 360);
    return { x: r.left + (r.width - 640 * scale) / 2 + point.x * scale,
      y: r.top + (r.height - 360 * scale) / 2 + point.y * scale };
  }

  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 8000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
  check('игра запущена реальным кликом', await ev(`!!window.__mm6State()`));

  // Три врага в разных рядах; у одного есть MP — проверяем обе ветки отрисовки.
  await ev(`(()=>{const g=window.__mm6State(),m=g.world.maps[g.world.current],p=g.player;
    Object.assign(p,{x:10,y:10,px:10,py:10,dir:0,moveT:0});
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)m.seen.add((10+dx)+','+(10+dy));
    const mk=(x,y,name,hp,maxHp,mp)=>({x,y,name,alive:true,hp,maxHp,atk:1,defVal:0,speed:1,def:{},gold:[0,0],
      ...(mp===undefined?{}:{mp:mp[0],maxMp:mp[1]})});
    m.monsters.length=0;
    m.monsters.push(mk(9,10,'Форпост',40,100));
    m.monsters.push(mk(10,9,'Страж',75,100,[30,50]));
    m.monsters.push(mk(11,8,'Дальний',60,80));
    g.msg='Карта: враги в поле зрения.';return true;})()`);
  await sleep(180);
  const report = await ev(`window.__mm6Debug.mapEnemyPanelsReport()`);
  check('панели показывают имена и живые HP врагов',
    report.panels.length === 3 && report.panels.map(p => p.name).join('|') === 'Форпост|Страж|Дальний' &&
    report.panels.map(p => p.hp + '/' + p.maxHp).join('|') === '40/100|75/100|60/80',
    JSON.stringify(report.panels.map(p => ({ name: p.name, hp: p.hp + '/' + p.maxHp }))));
  check('MP показывается только у врага с полем MP',
    report.panels.filter(p => p.hasMp).length === 1 && report.panels[1].mp === 30,
    JSON.stringify(report.panels.map(p => ({ name: p.name, hasMp: p.hasMp, mp: p.mp }))));

  check('панели не висят постоянно', report.panels.every(p => !p.shown) && !report.focus.has,
    JSON.stringify({ shown: report.panels.map(p => p.shown), focus: report.focus }));
  await ev(`window.__mm6Debug.focusMapEnemy(0,true)`);
  await sleep(120);
  const focused = await ev(`window.__mm6Debug.mapEnemyPanelsReport()`);
  check('удержание показывает плашку врага', focused.panels[0].shown && focused.focus.held,
    JSON.stringify({ shown: focused.panels.map(p => p.shown), focus: focused.focus }));
  const dark = await ev(`(()=>{const r=window.__mm6Debug.mapEnemyPanelsReport().panels[0].rect;
    const d=document.getElementById('cv').getContext('2d').getImageData(Math.round(r.x+4),Math.round(r.y+r.h-4),1,1).data;
    return {r:d[0],g:d[1],b:d[2],a:d[3]};})()`);
  check('фон панели тёмный', dark.a === 255 && dark.r < 45 && dark.g < 65 && dark.b < 95, JSON.stringify(dark));

  check('панели не заходят на фигуру героя',
    report.panels.every(p => p.rect.y + p.rect.h < report.hero.y - 20),
    JSON.stringify({ bottoms: report.panels.map(p => p.rect.y + p.rect.h), heroY: report.hero.y }));
  check('панели не перекрывают верхний HUD',
    report.panels.every(p => p.rect.y >= report.hud.y + report.hud.h),
    JSON.stringify({ tops: report.panels.map(p => p.rect.y), hudBottom: report.hud.y + report.hud.h }));
  const overlaps = report.panels.some((a, i) => report.panels.slice(i + 1).some(b =>
    a.rect.x < b.rect.x + b.rect.w && a.rect.x + a.rect.w > b.rect.x &&
    a.rect.y < b.rect.y + b.rect.h && a.rect.y + a.rect.h > b.rect.y));
  check('панели врагов не перекрывают друг друга', !overlaps,
    JSON.stringify(report.panels.map(p => p.rect)));

  // Данные берутся из объекта врага каждый кадр, поэтому HP обновляется без перезапуска сцены.
  await ev(`(()=>{const g=window.__mm6State(),m=g.world.maps[g.world.current];m.monsters[0].hp=12;return true;})()`);
  await sleep(150);
  const updated = await ev(`window.__mm6Debug.mapEnemyPanelsReport().panels[0].hp`);
  check('HP на панели обновляется из текущих данных врага', updated === 12, JSON.stringify(updated));

  // Итоговые атаки/защиты в плашке героя и инвентаре.
  const stats = await ev(`window.__mm6Debug.statsReport()`);
  const cardMini = await ev(`document.querySelector('#party .pcard .mini').textContent`);
  check('в плашке героя есть итоговые Атака и Защита',
    cardMini.includes('Атака '+stats[0].attack) && cardMini.includes('Защита '+stats[0].defense),
    JSON.stringify({ card: cardMini, stats: stats[0] }));
  await ev(`window.__mm6Debug.toggleInventory(true)`);
  await sleep(120);
  const invText = await ev(`document.querySelector('#mannequin .mq-stats').textContent`);
  check('в инвентаре показан итог Атаки/Защиты',
    invText.includes('итог '+stats[0].attack+' / '+stats[0].defense),
    JSON.stringify({ stats: stats[0], text: invText.slice(0, 120) }));
  const grid = await ev(`(()=>{const e=document.querySelector('#mannequin .mq-stats'),s=getComputedStyle(e);
    const cells=[...e.children].map(c=>{const r=c.getBoundingClientRect();return {x:+r.x.toFixed(1),w:+r.width.toFixed(1)};});
    return {display:s.display,min:s.minHeight,max:s.maxHeight,count:cells.length,columns:new Set(cells.map(c=>c.x)).size,widths:cells.map(c=>c.w)};})()`);
  check('сетка манекена не сломана: 6 ячеек, 2 колонки, фиксированная высота +10%',
    grid.display === 'grid' && grid.min === '141px' && grid.max === '141px' &&
    grid.count === 6 && grid.columns === 2 && grid.widths.every(w => w > 80 && w < 160),
    JSON.stringify(grid));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `UI PART 4 CHECKS FAILED (${failures})` : 'UI PART 4 CHECKS PASSED');
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
