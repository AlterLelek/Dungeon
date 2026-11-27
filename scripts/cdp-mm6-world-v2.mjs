// CDP-проверка мира: зоны сложности по расстоянию, вся карта мира, поселения,
// clustered-лавки, перекрёстная торговля, обновление стока и подсказки заданий.
// Запуск: node scripts/cdp-mm6-world-v2.mjs
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
const debugPort = 9970 + Math.floor(Math.random() * 20);
const profile = await mkdtemp(join(tmpdir(), 'mm6-world-v2-'));
const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map(), consoleErrors = [], badResponses = [];
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

  // 1. Зоны сложности зависят от расстояния, а не от номера карты или размера.
  await ev(`window.__mm6Debug.startGame('normal',[0])`);
  await waitFor('window.__mm6State() && window.__mm6State().world.difficulty==="normal"', 8000);
  const diff = await ev('window.__mm6Debug.difficultyReport()');
  const smallWorld = await ev('window.__mm6Debug.worldMapReport()');
  check('карта всего мира видна и для 30×30', smallWorld.ok && smallWorld.cell >= 1 &&
    smallWorld.names.length === smallWorld.count, JSON.stringify({cell:smallWorld.cell,names:smallWorld.names.length,count:smallWorld.count}));
  await ev('window.__mm6Debug.toggleBigMap(true)');
  const title30 = await ev('document.getElementById("bigMapTitle").textContent');
  check('заголовок карты мира для 30×30', /Весь мир/.test(title30), title30);
  await ev('window.__mm6Debug.toggleBigMap(false)');
  const wyverns = await ev(`(()=>{const g=window.__mm6State().world.maps;const out=[];g.forEach(m=>{(m.monsters||[]).forEach(e=>{if(e.id==='wyvern')out.push({map:m.index,id:e.id,dist:Math.abs(e.x-m.entry.x)+Math.abs(e.y-m.entry.y),band:e.band});});if(m.boss&&m.boss.def&&m.boss.def.id==='wyvern')out.push({map:m.index,id:'boss-wyvern',dist:Math.abs(m.boss.x-m.entry.x)+Math.abs(m.boss.y-m.entry.y),band:m.boss.band});});return out;})()`);
  check('монстры в стартовом радиусе — только мыши', diff.ok && diff.violations.nearOthers === 0 && diff.near > 0, JSON.stringify(diff.violations));
  check('виверна только на дальних пределах', diff.violations.wyvernNear === 0, JSON.stringify({violations:diff.violations,wyverns}));
  check('все зоны определены и совпадают с позициями', diff.bands.length === 4 && diff.total > 0 && diff.violations.bandMismatch === 0,
    JSON.stringify({bands:diff.bands.length,total:diff.total,mismatch:diff.violations.bandMismatch}));

  // Easy: стартовый радиус безопасен при любом размере карты.
  await ev(`(()=>{const d=window.__mm6Debug;d.setSettings({mapSize:100});d.startGame('easy',[0]);return true;})()`);
  await waitFor('window.__mm6State() && window.__mm6State().world && window.__mm6State().world.difficulty==="easy"', 8000);
  const easyDiff = await ev('window.__mm6Debug.difficultyReport()');
  check('лёгкая сложность: тишина и мыши в старте', easyDiff.ok && easyDiff.easy && easyDiff.violations.easyBad === 0,
    JSON.stringify({easy:easyDiff.easy,violations:easyDiff.violations}));

  // 2. Большая карта показывает весь мир сразу.
  const worldMap = await ev('window.__mm6Debug.worldMapReport()');
  check('большая карта вмещает весь мир', worldMap.ok && worldMap.cell >= 1, JSON.stringify({cell:worldMap.cell,cols:worldMap.cols,rows:worldMap.rows}));
  check('на карте есть вода, болота и дороги', worldMap.water > 0 && worldMap.swamp > 0 && worldMap.roads > 0,
    JSON.stringify({water:worldMap.water,swamp:worldMap.swamp,roads:worldMap.roads}));
  await ev('window.__mm6Debug.toggleBigMap(true)');
  const mapTitle = await ev('document.getElementById("bigMapTitle").textContent');
  check('заголовок большой карты — весь мир', /Весь мир/.test(mapTitle), mapTitle);
  await ev('window.__mm6Debug.toggleBigMap(false)');

  // 3–4. Поселения: имена, типы, состав зданий.
  const settlements = await ev('window.__mm6Debug.settlementReport()');
  check('поселения имеют имена и типы', settlements.ok && settlements.count > 0, JSON.stringify({count:settlements.count,errors:settlements.errors}));
  const cities = settlements.settlements.filter(s => s.type === 'city');
  check('город содержит все официальные здания', cities.length > 0 && cities.every(s =>
    ['hall','magic','forge','weapons','armor','tavern','inn','market'].every(k => s.buildings.includes(k))),
    JSON.stringify(cities.map(s => ({name:s.name,buildings:s.buildings}))));
  const villages = settlements.settlements.filter(s => s.type === 'village');
  check('деревня имеет урезанный состав', villages.length > 0 && villages.every(s =>
    s.buildings.includes('tavern') && !s.buildings.includes('magic') && !s.buildings.includes('armor')),
    JSON.stringify(villages.slice(0,2).map(s => ({name:s.name,buildings:s.buildings}))));
  const cluster = await ev(`(()=>{const maps=window.__mm6State().world.maps;
    return maps.map(m=>{const s=m.settlement&&m.settlement.buildings||[];
      const spread=s.length?Math.max(...s.map(b=>Math.max(Math.abs(b.x-m.settlement.x),Math.abs(b.y-m.settlement.y)))):99;
      return {name:m.settlement&&m.settlement.name,spread,roads:s.filter(b=>{
        let road=false; for(let y=b.y-1;y<=b.y+1&&!road;y++) for(let x=b.x-1;x<=b.x+1;x++){
          const c=m.cells[y]&&m.cells[y][x]; if(c&&(c.t==='road'||c.t==='bridge'||c.roadKind)) road=true;
        } return road;}).length,count:s.length};});})()`);
  check('здания поселения стоят одним двором и соединены дорогами',
    cluster.length > 0 && cluster.every(s => s.spread <= 6 && s.roads >= 1),
    JSON.stringify(cluster));

  // 5. Лавки: 10% перекрёстной торговли и обновление стока раз в игровой день.
  const stock = await ev('window.__mm6Debug.stockReport()');
  check('перекрёстная торговля 10% настроена', stock.ok && stock.crossSell.weaponsArmor > 0 && stock.crossSell.armoryWeapons > 0,
    JSON.stringify(stock.crossSell));
  await ev('window.__mm6Debug.forceShop("weapons")');
  const before = await ev('window.__mm6Debug.stockReport().period');
  const stockBefore = await ev('document.getElementById("shopList").textContent');
  const after = await ev('window.__mm6Debug.advanceTime(1440).period');
  const stockAfter = await ev('document.getElementById("shopList").textContent');
  check('сток обновился после игрового дня', after === before + 1 && stockBefore !== stockAfter,
    JSON.stringify({before,after,changed:stockBefore !== stockAfter}));
  await ev('window.__mm6Debug.forceShop("forge")');
  const forge = await ev('window.__mm6Debug.shopReport()');
  check('кузница перековывает всё', forge.ok && forge.reforge.universalForge, JSON.stringify(forge.reforge));
  await ev('window.__mm6Debug.forceShop("weapons")');
  const weapons = await ev('window.__mm6Debug.shopReport()');
  check('оружейная продаёт броню', weapons.ok && weapons.separation.crossSell.weaponsArmor > 0, JSON.stringify(weapons.separation.crossSell));

  // 6. Задания ратуши содержат направление, совпадающее с реальным логовищем.
  const quests = await ev('window.__mm6Debug.questReport()');
  check('все задания содержат подсказку направления', quests.ok && quests.quests.every(q => q.hint && q.compass),
    JSON.stringify(quests.quests.map(q => ({id:q.id,compass:q.compass,hint:q.hint}))));
  const guideCheck = await ev(`(()=>{const g=window.__mm6State().world.maps.find(m=>m.lair&&m.lair.guide);
    if(!g) return {ok:false};
    const guide=g.lair.guide, a=g.lair.anchor, h=g.settlement.hall, dx=a.x-h.x, dy=a.y-h.y;
    return {ok:guide.dx===dx&&guide.dy===dy&&guide.distance===Math.abs(dx)+Math.abs(dy),
      text:guide.text,dx,dy,dir:guide.compass};})()`);
  check('подсказка указывает верное направление', guideCheck.ok, JSON.stringify(guideCheck));
  const hallText = await ev(`(()=>{window.__mm6Debug.forceShop('hall');return document.getElementById('shopList').textContent;})()`);
  check('в ратуше видно направление', /к (востоку|западу|северу|югу|северо|юго)/.test(hallText), hallText.slice(0,200));
  const trail = await ev(`(()=>{const ms=window.__mm6State().world.maps.filter(m=>m.lair&&m.lair.guide&&m.lair.template);
    return ms.map(m=>{const g=m.lair.guide,h=m.settlement.hall,a=m.lair.anchor;
      let x=h.x,y=h.y;
      for(let i=0;i<Math.abs(g.dx);i++) x+=Math.sign(g.dx);
      for(let i=0;i<Math.abs(g.dy);i++) y+=Math.sign(g.dy);
      const lairEnemies=m.monsters.filter(e=>e.lairId===m.lair.template.id);
      return {id:m.lair.template.id,reached:x===a.x&&y===a.y,
        near:lairEnemies.some(e=>Math.abs(e.x-a.x)+Math.abs(e.y-a.y)<=4),
        tier:m.tier,band:m.lair.band,
        dist:Math.abs(a.x-m.entry.x)+Math.abs(a.y-m.entry.y),
        compass:g.compass,text:g.text};});})()`);
  check('следование подсказке приводит к логовищу',
    trail.length >= 3 && trail.every(t => t.reached && t.near),
    JSON.stringify(trail.map(t => ({id:t.id,reached:t.reached,near:t.near,compass:t.compass}))));
  const byLair = Object.fromEntries(trail.map(t => [t.id, t]));
  const harder = byLair.mouse_nest && byLair.spider_lair && byLair.bone_yard &&
    byLair.mouse_nest.tier <= byLair.spider_lair.tier && byLair.spider_lair.tier <= byLair.bone_yard.tier &&
    byLair.mouse_nest.dist <= byLair.spider_lair.dist && byLair.spider_lair.dist <= byLair.bone_yard.dist;
  check('дальние логовища сложнее', harder,
    JSON.stringify(trail.map(t => ({id:t.id,dist:t.dist,tier:t.tier,band:t.band}))));

  check('консоль без ошибок', consoleErrors.length === 0, consoleErrors.slice(0,3).join(' | '));
  check('нет 4xx/5xx', badResponses.length === 0, badResponses.slice(0,3).join(' | '));
} catch (e) {
  console.error('CDP error:', e);
  failures++;
} finally {
  if (ws) ws.close();
  chrome.kill();
  server.close();
}
console.log(failures ? `ИТОГО: ${failures} ошибок` : 'ИТОГО: все проверки пройдены');
process.exit(failures ? 1 : 0);
