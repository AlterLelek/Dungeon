// CDP-проверка первой части новой задачи: двуручник блокирует обе руки.
// Запуск: node scripts/cdp-mm6-hands-p1.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'mm6-hands-p1-'));
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
  const geom = () => ev(`(()=>{const r=e=>{const b=e.getBoundingClientRect();return {x:+b.x.toFixed(1),y:+b.y.toFixed(1),w:+b.width.toFixed(1),h:+b.height.toFixed(1)};};
    const st=e=>{const s=getComputedStyle(e);return {min:s.minHeight,max:s.maxHeight};};
    return {strip:r(document.querySelector('.invSlotStrip')),stats:st(document.querySelector('#mannequin .mq-stats')),
      desc:st(document.querySelector('#mannequin .mq-desc')),
      offhand:r(document.querySelector('#mannequin [data-slot="offhand"]')),
      weapon:r(document.querySelector('#mannequin [data-slot="weapon"]'))};})()`);

  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 8000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
  check('игра запущена реальным кликом', await ev(`!!window.__mm6State()`));

  await ev(`(()=>{const g=window.__mm6State();g.invHero=0;
    g.bag.push({uid:'hands-shield',type:'armor',slot:'shield',name:'Тестовый щит',armorDef:3,
      cost:5,sell:2,quality:1,set:'any',reforges:0,enchant:null,icon:'🛡',weight:5});
    g.bag.push({uid:'hands-axe',type:'weapon',name:'Двуручный топор',dmg:9,baseDmg:9,wkind:'axe',
      two_handed:true,quality:1,set:'any',reforges:0,enchant:null,icon:'🪓',weight:8});
    g.bag.push({uid:'hands-dagger',type:'weapon',name:'Кинжал второй руки',dmg:3,baseDmg:3,wkind:'dagger',
      quality:1,set:'any',reforges:0,enchant:null,icon:'🗡',weight:2});
    return true;})()`);
  await ev(`window.__mm6Debug.toggleInventory(true)`);
  await sleep(150);
  check('щит надевается до двуручника', await ev(`window.__mm6Debug.equipByUid('hands-shield','shield')`));
  const before = await geom();

  check('двуручный топор надевается', await ev(`window.__mm6Debug.equipByUid('hands-axe','weapon')`));
  const equipped = await ev(`window.__mm6Debug.handsReport()`);
  check('двуручник занимает обе руки: маркер во второй руке',
    equipped.twoHanded && equipped.marker && equipped.offhandUid === 'hands-axe' && equipped.ok,
    JSON.stringify({ twoHanded: equipped.twoHanded, marker: equipped.marker, offhand: equipped.offhandUid, errors: equipped.errors }));
  check('щит автоматически снят при надевании двуручника',
    equipped.shieldUid === null && await ev(`(()=>{const i=window.__mm6State().bag.find(x=>x.uid==='hands-shield');return !i.owner;})()`),
    JSON.stringify({ shield: equipped.shieldUid }));
  check('слот второй руки в манекене показывает древко/рукоять',
    equipped.dom && equipped.dom.cls.includes('busy') && equipped.dom.glyph && /занято древком Двуручный топор/.test(equipped.dom.title),
    JSON.stringify(equipped.dom));
  check('плашка второй руки тоже помечена как занятая', equipped.chipBusy, JSON.stringify(equipped.chipBusy));
  check('слот второй руки есть в манекене и инвентаре',
    equipped.slots.includes('offhand') && await ev(`!!document.querySelector('#invList [data-slot="offhand"]')`),
    JSON.stringify(equipped.slots));

  const after = await geom();
  check('геометрия инвентаря не меняется при блокировке руки',
    JSON.stringify(before) === JSON.stringify(after), JSON.stringify({ before, after }));

  check('щит нельзя надеть, пока двуручник в руках',
    (await ev(`window.__mm6Debug.equipByUid('hands-shield','shield')`)) === false &&
    (await toast()).includes('Руки заняты'), await toast());
  check('предмет во вторую руку нельзя надеть, пока двуручник в руках',
    (await ev(`window.__mm6Debug.equipByUid('hands-dagger','offhand')`)) === false &&
    (await toast()).includes('Руки заняты'), await toast());

  const offPoint = await ev(`(()=>{const r=document.querySelector('#mannequin [data-slot="offhand"]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(offPoint.x, offPoint.y);
  const clicked = await ev(`window.__mm6Debug.handsReport()`);
  check('клик по занятой второй руке объясняет блокировку и не снимает оружие',
    (await toast()).includes('снимите двуручное оружие') && clicked.marker && clicked.twoHanded,
    JSON.stringify({ toast: await toast(), marker: clicked.marker }));

  check('снятие двуручника освобождает обе руки',
    await ev(`window.__mm6Debug.unequipBySlot('weapon')`) && await ev(`(()=>{const r=window.__mm6Debug.handsReport();
      return !r.twoHanded&&!r.marker&&r.offhandUid===null&&r.ok&&!!r.dom&&!r.dom.cls.includes('busy')&&r.dom.title.includes('свободна');})()`),
    JSON.stringify(await ev(`window.__mm6Debug.handsReport()`)));
  check('щит снова надевается после снятия', await ev(`window.__mm6Debug.equipByUid('hands-shield','shield')`));

  check('вторая рука принимает одноручное оружие, когда свободна',
    await ev(`window.__mm6Debug.equipByUid('hands-dagger','offhand')`) && await ev(`(()=>{const r=window.__mm6Debug.handsReport();
      return r.offhand==='Кинжал второй руки'&&!r.marker&&r.ok;})()`),
    JSON.stringify(await ev(`window.__mm6Debug.handsReport()`)));
  check('двуручник вытесняет оружие из второй руки и возвращает его в сумку',
    await ev(`window.__mm6Debug.equipByUid('hands-axe','weapon')`) && await ev(`(()=>{const g=window.__mm6State(),d=g.bag.find(x=>x.uid==='hands-dagger');
      const r=window.__mm6Debug.handsReport();return r.marker&&!!d&&!d.owner;})()`) &&
    (await toast()).includes('Вторая рука освобождена'), await toast());

  // Старый сейв: в equip нет ключа offhand, но двуручник надет — миграция обязана восстановить блокировку.
  await ev(`window.__mm6Debug.saveWorld()`);
  await ev(`(()=>{const k='mm6_world_save_v1',raw=JSON.parse(localStorage.getItem(k));
    delete raw.party[0].equip.offhand; localStorage.setItem(k,JSON.stringify(raw));return true;})()`);
  check('старый сейв загружается', await ev(`window.__mm6Debug.loadWorld()`));
  await ev(`window.__mm6Debug.toggleInventory(true)`);
  await sleep(120);
  const migrated = await ev(`window.__mm6Debug.handsReport()`);
  check('миграция старого сейва восстанавливает блокировку второй руки',
    migrated.twoHanded && migrated.marker && migrated.ok && !!migrated.dom && migrated.dom.cls.includes('busy'),
    JSON.stringify(migrated));

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `HANDS PART 1 CHECKS FAILED (${failures})` : 'HANDS PART 1 CHECKS PASSED');
  process.exitCode = failures ? 1 : 0;
} catch (e) {
  console.error('CDP TEST ERROR', e);
  process.exitCode = 1;
} finally {
  if (ws) ws.close();
  chrome.kill('SIGKILL');
  server.close();
}
