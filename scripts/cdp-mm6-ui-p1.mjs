// CDP-проверка первой части: геометрия панелей описания, поворот Q/E, тосты в бою и панели карты.
// Запуск: node scripts/cdp-mm6-ui-p1.mjs
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
const debugPort = 9600 + Math.floor(Math.random() * 600);
const profile = await mkdtemp(join(tmpdir(), 'mm6-ui-p1-'));
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

  // --- Панели описания инвентаря ---
  await ev(`(()=>{const g=window.__mm6State();g.bag.push({uid:'p1-hover',count:1,cost:0,sell:0,type:'weapon',
    name:'Проверочный меч',dmg:5,baseDmg:5,quality:1,wkind:'sword',set:'any',weight:1,icon:'⚔',reforges:0,enchant:null});
    return true;})()`);
  await ev(`document.getElementById('btnInv').click()`);
  await sleep(350);
  check('инвентарь открыт', await ev(`!document.getElementById('inventory').classList.contains('hidden')`));
  const geomExpr = `(()=>{const q=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);
    return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),min:c.minHeight,max:c.maxHeight,ov:c.overflowY};};
    return {detail:q('#invDetail'),desc:q('.mq-desc'),mannequin:q('#mannequin'),cells:document.querySelectorAll('.invCell').length};})()`;
  const g0 = await ev(geomExpr);
  check('высота панелей описания жёстко фиксирована',
    g0.detail && g0.desc && g0.detail.min === g0.detail.max && g0.desc.min === g0.desc.max &&
    g0.detail.ov === 'auto' && g0.desc.ov === 'auto',
    JSON.stringify({ detail: [g0.detail?.min, g0.detail?.max, g0.detail?.ov], desc: [g0.desc?.min, g0.desc?.max, g0.desc?.ov] }));
  const cellPoint = await ev(`(()=>{const e=document.querySelector('.invCell');if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  check('в инвентаре есть предмет для наведения', !!cellPoint, JSON.stringify(g0.cells));
  if (cellPoint) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cellPoint.x, y: cellPoint.y });
    await sleep(180);
    const g1 = await ev(geomExpr);
    const same = (a, b) => ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) < .01);
    check('наведение на предмет не меняет геометрию панелей',
      same(g0.detail, g1.detail) && same(g0.desc, g1.desc) && same(g0.mannequin, g1.mannequin),
      JSON.stringify({ before: [g0.detail.h, g0.desc.h, g0.mannequin.h], after: [g1.detail.h, g1.desc.h, g1.mannequin.h] }));
    await click(cellPoint.x, cellPoint.y);
    await sleep(180);
    const g2 = await ev(geomExpr);
    check('выбор предмета не меняет геометрию панелей',
      same(g0.detail, g2.detail) && same(g0.desc, g2.desc) && same(g0.mannequin, g2.mannequin),
      JSON.stringify({ before: [g0.detail, g0.desc, g0.mannequin], after: [g2.detail, g2.desc, g2.mannequin] }));
  }
  await ev(`document.getElementById('invClose').click()`);
  await sleep(200);

  // --- Поворот Q/E рядом со зданием ---
  const placed = await ev(`(()=>{const g=window.__mm6State(),m=g.world.maps[g.world.current];
    const dirs=[[0,-1],[1,0],[0,1],[-1,0]],blocked=['tree','mountain','rock','house','shop','boss'];
    for(let y=1;y<m.size-1;y++)for(let x=1;x<m.size-1;x++){
      const c=m.cells[y][x]; if(c.t!=='shop'&&c.t!=='house') continue;
      for(let d=0;d<4;d++){const [dx,dy]=dirs[d],nx=x-dx,ny=y-dy,nc=m.cells[ny]&&m.cells[ny][nx];
        if(!nc||blocked.includes(nc.t)||(nc.water&&nc.t!=='bridge')) continue;
        Object.assign(g.player,{x:nx,y:ny,px:nx,py:ny,fromX:nx,fromY:ny,moveT:0,dir:d});
        // Детерминируем подсказки: в поле зрения должна быть простая трава, а не только здание.
        const dirs4=[[0,-1],[1,0],[0,1],[-1,0]], f=dirs4[d], r=dirs4[(d+1)%4];
        for(let fw=0;fw<=2;fw++)for(let sd=-2;sd<=2;sd++){
          const cx=nx+f[0]*fw+r[0]*sd, cy=ny+f[1]*fw+r[1]*sd;
          const c=m.cells[cy]&&m.cells[cy][cx]; if(!c) continue;
          m.seen.add(cx+','+cy);
          if(c.t!=='shop'&&c.t!=='house'&&c.t!=='boss'){ c.t='grass'; c.ground='grass'; c.roadKind=null; }
        }
        window.__mm6Debug.toggleShop(false); // обновить состояние кнопок после прямой установки позиции
        return {x:nx,y:ny,dir:d,building:c.t};
      }
    }
    return null;})()`);
  check('герой поставлен вплотную к зданию', !!placed, JSON.stringify(placed));
  const posExpr = `(()=>{const g=window.__mm6State(),p=g.player;return {x:p.x,y:p.y,px:p.px,py:p.py,fromX:p.fromX,fromY:p.fromY,
    moveT:p.moveT,dir:p.dir,shopOpen:g.shopOpen,shopHidden:document.getElementById('shop').classList.contains('hidden'),
    canInteract:!document.getElementById('btnInteract').disabled,turn:g.world.turn};})()`;
  if (placed) {
    check('взаимодействие с зданием доступно', await ev(posExpr + '.canInteract'));
    const p0 = await ev(posExpr);
    await key('e', 'KeyE', 69);
    const p1 = await ev(posExpr);
    check('E поворачивает на месте и не входит в здание',
      p1.dir === (p0.dir + 1) % 4 && ['x', 'y', 'px', 'py', 'fromX', 'fromY', 'moveT', 'turn'].every(k => p1[k] === p0[k]) &&
      !p1.shopOpen && p1.shopHidden && p1.canInteract,
      JSON.stringify({ from: p0.dir, to: p1.dir, xy: [p1.x, p1.y], shopOpen: p1.shopOpen }));
    await key('q', 'KeyQ', 81);
    const p2 = await ev(posExpr);
    check('Q поворачивает на месте и не входит в здание',
      p2.dir === (p1.dir + 3) % 4 && ['x', 'y', 'px', 'py', 'fromX', 'fromY', 'moveT', 'turn'].every(k => p2[k] === p1[k]) &&
      !p2.shopOpen && p2.shopHidden && p2.canInteract,
      JSON.stringify({ from: p1.dir, to: p2.dir, xy: [p2.x, p2.y] }));
  }

  // --- Информационные панели карты не закрывают героя ---
  await sleep(200);
  let hintFound = false;
  for (let y = 150; y <= 290 && !hintFound; y += 35) {
    for (let x = 100; x <= 540 && !hintFound; x += 55) {
      hintFound = !!(await ev(`(()=>{const cv=document.getElementById('cv'),r=cv.getBoundingClientRect();
        cv.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',
          clientX:r.left+${x}*r.width/640,clientY:r.top+${y}*r.height/360}));
        return !!window.__mm6Debug.mapHintHudReport().hint;})()`));
      if (!hintFound) await sleep(30);
    }
  }
  await sleep(120);
  const hud = await ev(`window.__mm6Debug.mapHintHudReport()`);
  check('подсказка местности появляется при наведении', !!hud.hint,
    JSON.stringify({ hint: hud.hint, hints: await ev(`window.__mm6Debug.mapHintReport().count`) }));
  check('панели «Дорога/враги» не заходят на фигуру героя',
    hud.hintRight < hud.heroLeft && hud.warnRight < hud.heroLeft,
    JSON.stringify({ hintRight: hud.hintRight, warnRight: hud.warnRight, heroLeft: hud.heroLeft }));

  // --- Тост в бою не перекрывает плашки героев ---
  await ev(`(()=>{window.__mm6Debug.startGame('normal',[0,1,2]);
    const mk=(name)=>({name,alive:true,hp:100000,maxHp:100000,atk:1,defVal:0,speed:1,def:{},gold:[0,0]});
    window.__mm6Debug.startBattle([mk('Враг A'),mk('Враг B')]);window.__mm6State().battle.targetIdx=-1;return true;})()`);
  await waitFor(`(()=>{const b=window.__mm6State().battle;return !!b&&b.turn==='hero'&&!b.busy;})()`);
  const chip = await ev(`(()=>{const r=window.__mm6Debug.battleInputReport().chips.find(c=>c.id==='attack');
    return {x:r.x+r.w/2,y:r.y+r.h/2};})()`);
  const chipClient = await clientOf(chip);
  await click(chipClient.x, chipClient.y);
  await sleep(120);
  const toastInfo = await ev(`(()=>{const t=document.getElementById('toast'),r=t.getBoundingClientRect();
    const cards=[...document.querySelectorAll('#party .pcard')].map(e=>e.getBoundingClientRect());
    return {text:t.textContent,shown:t.classList.contains('show'),bottom:+r.bottom.toFixed(1),
      partyTop:+Math.min(...cards.map(c=>c.top)).toFixed(1),cards:cards.length};})()`);
  check('тост «Выберите цель» показан', toastInfo.shown && /Выберите цель/.test(toastInfo.text), JSON.stringify(toastInfo.text));
  check('тост в бою не заступает на плашки героев',
    toastInfo.cards === 3 && toastInfo.bottom < toastInfo.partyTop,
    JSON.stringify({ toastBottom: toastInfo.bottom, partyTop: toastInfo.partyTop }));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `UI PART 1 CHECKS FAILED (${failures})` : 'UI PART 1 CHECKS PASSED');
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
