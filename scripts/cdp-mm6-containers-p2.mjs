// CDP-проверка второй части новой задачи: контейнеры, категории, вес и миграция.
// Запуск: node scripts/cdp-mm6-containers-p2.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'mm6-containers-p2-'));
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
  const toast = () => ev(`document.getElementById('toast').textContent`);
  const report = () => ev(`window.__mm6Debug.containerReport()`);

  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 8000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
  await ev(`window.__mm6Debug.toggleInventory(true)`);
  await sleep(150);

  const initial = await report();
  check('пять контейнеров созданы', initial.containers.length === 5 &&
    ['pockets', 'belt', 'purse', 'bag', 'chest'].every(id => initial.containers.some(c => c.id === id)),
    JSON.stringify(initial.containers.map(c => c.id)));
  check('вкладки контейнеров показывают X/Y',
    JSON.stringify(initial.tabs) === JSON.stringify(await ev(`[...document.querySelectorAll('.containerTab')].map(b=>b.textContent)`)),
    JSON.stringify(initial.tabs));
  check('вес контейнеров входит в общий вес',
    initial.weight === 0 && initial.totalWeight === initial.gearWeight && initial.ok,
    JSON.stringify({ weight: initial.weight, total: initial.totalWeight, gear: initial.gearWeight }));

  // Переполнение: все подходящие контейнеры закрыты, предмет обязан остаться в инвентаре.
  await ev(`(()=>{window.__mm6Debug.setContainerCapacity('belt',0);
    window.__mm6Debug.setContainerCapacity('pockets',0);
    window.__mm6Debug.setContainerCapacity('bag',0);return true;})()`);
  const overflowUid = await ev(`window.__mm6Debug.addItemBySpec({id:'c2-overflow',type:'herb',name:'Переполненная трава',icon:'🌿',effect:'hp',value:1,cost:1,sell:1})`);
  const overflow = await ev(`(()=>{const it=window.__mm6State().bag.find(x=>x.uid==='${overflowUid}');
    return {found:!!it,container:it&&it.container||null,r:window.__mm6Debug.containerReport()};})()`);
  check('переполнение контейнера даёт тост', (await toast()).includes('переполнен'), await toast());
  check('переполнение не теряет предмет', overflow.found && overflow.container === null &&
    overflow.r.loose.includes('Переполненная трава'), JSON.stringify({ found: overflow.found, container: overflow.container }));
  await ev(`(()=>{window.__mm6Debug.setContainerCapacity('belt',6);
    window.__mm6Debug.setContainerCapacity('pockets',8);
    window.__mm6Debug.setContainerCapacity('bag',16);return true;})()`);
  await ev(`(()=>{const g=window.__mm6State(),it=g.bag.find(x=>x.uid==='${overflowUid}');
    it.container=null;return true;})()`);

  // Авто-подбор по категориям.
  const herbUid = await ev(`window.__mm6Debug.addItemBySpec({id:'c2-herb',type:'herb',name:'Поясная трава',icon:'🌿',effect:'hp',value:2,cost:1,sell:1})`);
  const scrollUid = await ev(`window.__mm6Debug.addItemBySpec({id:'c2-scroll',type:'scroll',name:'Карманный свиток',icon:'📜',spell:'fire',cost:4,sell:2})`);
  const weaponUid = await ev(`window.__mm6Debug.addItemBySpec({type:'weapon',name:'Сумковый меч',dmg:2,baseDmg:2,wkind:'sword',quality:1,set:'any',cost:3,sell:1,icon:'⚔'})`);
  const placed = await ev(`(()=>{const g=window.__mm6State(),get=u=>g.bag.find(x=>x.uid===u);
    return {herb:get('${herbUid}').container,scroll:get('${scrollUid}').container,weapon:get('${weaponUid}').container};})()`);
  check('авто-подбор раскладывает по категориям',
    placed.herb === 'belt' && placed.scroll === 'pockets' && placed.weapon === 'bag', JSON.stringify(placed));

  // Вес контейнера увеличивает общий вес.
  await ev(`(()=>{window.__mm6State().containers.bag.weight=3;return true;})()`);
  const weighted = await report();
  check('вес контейнера прибавляется к нагрузке',
    weighted.weight === 3 && weighted.totalWeight === weighted.gearWeight + 3,
    JSON.stringify({ weight: weighted.weight, gear: weighted.gearWeight, total: weighted.totalWeight }));
  await ev(`(()=>{window.__mm6State().containers.bag.weight=0;return true;})()`);

  // Ручное перекладывание через API и через кнопку на ячейке.
  check('ручное перекладывание в другой контейнер',
    await ev(`window.__mm6Debug.moveToContainer('${weaponUid}','chest')`) &&
    await ev(`window.__mm6State().bag.find(x=>x.uid==='${weaponUid}').container==='chest'`), await toast());
  await ev(`(()=>{document.querySelector('.containerTab[data-container="belt"]').click();return true;})()`);
  await sleep(100);
  const moveUi = await ev(`(()=>{const b=document.querySelector('.invCell .moveBtn');if(!b) return null;
    b.click();const g=window.__mm6State(),it=g.bag.find(x=>x.uid==='${herbUid}');
    return {target:b.dataset.move,container:it&&it.container||null};})()`);
  check('кнопка перекладывания в сетке работает',
    !!moveUi && moveUi.container !== 'belt' && moveUi.container !== 'purse' && moveUi.container === moveUi.target, JSON.stringify(moveUi));

  // Переполнение при ручном перекладывании: предмет остаётся на месте.
  await ev(`(()=>{window.__mm6Debug.setContainerCapacity('belt',1);
    const g=window.__mm6State(),it=g.bag.find(x=>x.uid==='${herbUid}');it.container='belt';return true;})()`);
  const secondHerb = await ev(`window.__mm6Debug.addItemBySpec({id:'c2-herb2',type:'herb',name:'Вторая трава',icon:'🌿',effect:'hp',value:2,cost:1,sell:1})`);
  const manualOverflow = await ev(`(()=>{const ok=window.__mm6Debug.moveToContainer('${secondHerb}','belt');
    const g=window.__mm6State(),it=g.bag.find(x=>x.uid==='${secondHerb}');
    return {ok,container:it&&it.container||null,stillThere:!!it};})()`);
  check('ручное перекладывание в полный контейнер не теряет предмет',
    manualOverflow.ok === false && manualOverflow.stillThere && manualOverflow.container !== 'belt' &&
    (await toast()).includes('полон'), JSON.stringify(manualOverflow));
  await ev(`(()=>{window.__mm6Debug.setContainerCapacity('belt',6);return true;})()`);

  // Апгрейд контейнера увеличивает число слотов и списывает золото.
  const beforeUpgrade = await ev(`({gold:window.__mm6State().gold,cap:window.__mm6State().containers.pockets.capacity})`);
  const upgraded = await ev(`window.__mm6Debug.upgradeContainer('pockets')`);
  const afterUpgrade = await ev(`({gold:window.__mm6State().gold,cap:window.__mm6State().containers.pockets.capacity,
    up:window.__mm6State().containers.pockets.upgrade})`);
  check('апгрейд контейнера добавляет слоты и стоит золота',
    upgraded && afterUpgrade.cap > beforeUpgrade.cap && afterUpgrade.gold < beforeUpgrade.gold && afterUpgrade.up === 1,
    JSON.stringify({ before: beforeUpgrade, after: afterUpgrade }));
  await ev(`(()=>{document.querySelector('.containerTab[data-container="pockets"]').click();return true;})()`);
  await sleep(100);
  check('вкладка показывает обновлённое число слотов',
    (await ev(`document.querySelector('.containerTab[data-container="pockets"]').textContent`)).includes('/'+afterUpgrade.cap),
    await ev(`document.querySelector('.containerTab[data-container="pockets"]').textContent`));

  // Замена пояса переносит ёмкость и вес, содержимое сохраняется.
  await ev(`(()=>{const g=window.__mm6State();g.bag.push({uid:'c2-belt',type:'container',containerKind:'belt',
    name:'Новый пояс',capacity:9,weight:2,cost:6,sell:3,icon:'🎒'});return true;})()`);
  const beforeBelt = await report();
  const replaced = await ev(`window.__mm6Debug.replaceBelt('c2-belt')`);
  const afterBelt = await report();
  const beltRow = afterBelt.containers.find(c => c.id === 'belt');
  check('замена пояса увеличивает ёмкость и сохраняет содержимое',
    replaced && beltRow.capacity >= 9 && beltRow.weight === 2 && beltRow.used === beforeBelt.containers.find(c => c.id === 'belt').used &&
    await ev(`!window.__mm6State().bag.some(x=>x.uid==='c2-belt')`), JSON.stringify(beltRow));
  check('вес нового пояса учтён в нагрузке', afterBelt.weight === 2 && afterBelt.totalWeight === afterBelt.gearWeight + 2,
    JSON.stringify({ weight: afterBelt.weight, total: afterBelt.totalWeight, gear: afterBelt.gearWeight }));

  // Миграция старого сейва: нет контейнеров и поля container у предметов.
  const savedCount = await ev(`window.__mm6Debug.saveWorld()`);
  const stripped = await ev(`(()=>{const k='mm6_world_save_v1',raw=JSON.parse(localStorage.getItem(k));
    delete raw.containers;
    (raw.bag||[]).forEach(it=>delete it.container);
    localStorage.setItem(k,JSON.stringify(raw));return {bags:(raw.bag||[]).length};})()`);
  const loaded = await ev(`window.__mm6Debug.loadWorld()`);
  await ev(`window.__mm6Debug.toggleInventory(true)`);
  await sleep(150);
  const migrated = await report();
  const afterCount = await ev(`window.__mm6State().bag.length`);
  check('старый сейв загружается', savedCount && loaded && stripped.bags === afterCount,
    JSON.stringify({ savedCount, loaded, before: stripped.bags, after: afterCount }));
  check('миграция восстанавливает контейнеры и не теряет предметы',
    migrated.ok && migrated.containers.length === 5 && migrated.containers.every(c => c.accept.length >= 0) &&
    migrated.tabs.length === 5 && migrated.loose.length === 0,
    JSON.stringify({ ok: migrated.ok, errors: migrated.errors, loose: migrated.loose }));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `CONTAINERS PART 2 CHECKS FAILED (${failures})` : 'CONTAINERS PART 2 CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
