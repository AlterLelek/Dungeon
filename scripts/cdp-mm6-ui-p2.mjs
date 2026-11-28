// CDP-проверка второй части: размеры боевых панелей, компактный лог и честная подпись врагов.
// Запуск: node scripts/cdp-mm6-ui-p2.mjs
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
const debugPort = 9700 + Math.floor(Math.random() * 600);
const profile = await mkdtemp(join(tmpdir(), 'mm6-ui-p2-'));
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
  async function key(k, code, vk) {
    const p = { key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...p });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
  }
  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 8000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
  const startBattle = names => ev(`(()=>{const g=window.__mm6State();g.battle=null;
    const list=${JSON.stringify(names)}.map(name=>({name,alive:true,hp:100000,maxHp:100000,atk:3,defVal:1,speed:1,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);return true;})()`);
  await startBattle(['Черт', 'Скелет', 'Зелёный Паук']);
  await waitFor(`(()=>{const b=window.__mm6State().battle;return !!b&&b.turn==='hero'&&!b.busy;})()`);
  await sleep(150);

  // --- Размеры панелей ---
  const hud = await ev(`window.__mm6Debug.battleHudReport()`);
  check('верхняя панель врага компактная', hud.panel.w >= 216 && hud.panel.w <= 224 &&
    hud.panel.h >= 54 && hud.panel.h <= 62, JSON.stringify(hud.panel));
  check('бейдж хода не перекрывает панель врага',
    hud.panel.x + hud.panel.w <= hud.badge.x || hud.panel.x >= hud.badge.x + hud.badge.w,
    JSON.stringify({ panel: hud.panel, badge: hud.badge }));
  check('окно лога компактное', hud.msg.h <= 72 && hud.msg.h >= 60, JSON.stringify(hud.msg));
  const cardStyle = await ev(`(()=>{const e=document.querySelector('#party.in-battle .pcard');if(!e)return null;
    const s=getComputedStyle(e),q=n=>getComputedStyle(e.querySelector(n));
    return {emoji:q('.pemoji').fontSize,nums:q('.nums').fontSize,miniDisplay:q('.mini').display,
      bar:q('.pbar').height,mpBar:q('.pbar.mp').height,stats:q('.pstats').display,
      level:q('.plevel').display,face:q('.pface').width,cardClass:e.dataset.class};})()`);
  check('плашки героев компактные, около +10%',
    cardStyle && parseFloat(cardStyle.emoji) >= 16 && parseFloat(cardStyle.emoji) <= 18 &&
    parseFloat(cardStyle.nums) >= 11 && parseFloat(cardStyle.nums) <= 12 &&
    parseFloat(cardStyle.bar) >= 3 && parseFloat(cardStyle.bar) <= 4 &&
    parseFloat(cardStyle.mpBar) >= 3 && parseFloat(cardStyle.mpBar) <= 4, JSON.stringify(cardStyle));
  check('в бою статы значками, уровень и медальон видны, старая строка скрыта',
    cardStyle && cardStyle.miniDisplay === 'none' && cardStyle.stats === 'flex' &&
    cardStyle.level === 'block' && parseFloat(cardStyle.face) >= 20 && !!cardStyle.cardClass,
    JSON.stringify(cardStyle));
  const stageBottom = await ev(`document.getElementById('stage').getBoundingClientRect().bottom`);
  check('плашки героев остаются внизу',
    hud.party.length === 3 && hud.party.every(c => c.h >= 64 && c.h <= 76) &&
    hud.party.every(c => Math.abs(c.bottom - stageBottom) <= 10),
    JSON.stringify({ heights: hud.party.map(c => c.h), bottom: hud.party[0]?.bottom, stageBottom }));
  const queue = await ev(`window.__mm6Debug.turnQueueReport()`);
  const queueStyle = await ev(`(()=>{const e=document.getElementById('turnQueue'),r=e.querySelector('.tq-row');
    return {width:e.getBoundingClientRect().width,padding:getComputedStyle(r).paddingTop,
      font:getComputedStyle(r).fontSize};})()`);
  check('очередь ходов компактная и ограничена пятью строками',
    queue.visible && queue.rows.length === queue.limit && queue.total > queue.limit && queue.more &&
    parseFloat(queueStyle.width) <= 96 && parseFloat(queueStyle.padding) <= 2 &&
    parseFloat(queueStyle.font) <= 9, JSON.stringify({ queue: { total: queue.total,
      limit: queue.limit, rows: queue.rows.length, more: queue.more }, style: queueStyle }));

  // --- Честная подпись группы ---
  check('разные враги перечислены полными именами',
    hud.label === 'Черт, Скелет, Зелёный Паук', JSON.stringify(hud.label));
  await startBattle(['Черт', 'Черт', 'Черт']);
  await waitFor(`(()=>{const b=window.__mm6State().battle;return !!b&&b.turn==='hero'&&!b.busy;})()`);
  await sleep(100);
  const same = await ev(`window.__mm6Debug.battleHudReport().label`);
  check('одинаковые враги получают честный счётчик', same === 'Черт +2', JSON.stringify(same));

  // --- Прокрутка боевого лога ---
  await ev(`(()=>{const b=window.__mm6State().battle;
    for(let i=0;i<8;i++)b.log.push({text:'Строка журнала '+(i+1)+' · длинное сообщение для проверки прокрутки',color:'#fde68a',side:'neutral'});
    return true;})()`);
  await sleep(150);
  const log0 = await ev(`window.__mm6Debug.battleHudReport()`);
  check('длинный лог не разрастает окно и имеет прокрутку',
    log0.msg.h === hud.msg.h && log0.logRows > 3 && log0.logScrollMax > 0,
    JSON.stringify({ h: log0.msg.h, rows: log0.logRows, max: log0.logScrollMax }));
  await key('ArrowUp', 'ArrowUp', 38);
  const log1 = await ev(`window.__mm6Debug.battleHudReport()`);
  check('ArrowUp поднимает лог на старые строки', log1.logScroll === 1, JSON.stringify(log1.logScroll));
  await key('ArrowDown', 'ArrowDown', 40);
  const log2 = await ev(`window.__mm6Debug.battleHudReport()`);
  check('ArrowDown возвращает лог к последним строкам', log2.logScroll === 0, JSON.stringify(log2.logScroll));

  // --- DOM-журнал событий ---
  const logBtn = await ev(`(()=>{const r=document.getElementById('btnLog').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(logBtn.x, logBtn.y);
  await sleep(150);
  const domLog = await ev(`(()=>{const e=document.getElementById('logList'),r=e.getBoundingClientRect(),s=getComputedStyle(e);
    return {h:+r.height.toFixed(1),max:s.maxHeight,ov:s.overflowY,open:!document.getElementById('eventLog').classList.contains('hidden')};})()`);
  check('журнал событий фиксированной высоты с внутренней прокруткой',
    domLog.open && domLog.h <= 100 && domLog.max === '97px' && domLog.ov === 'auto', JSON.stringify(domLog));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `UI PART 2 CHECKS FAILED (${failures})` : 'UI PART 2 CHECKS PASSED');
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
