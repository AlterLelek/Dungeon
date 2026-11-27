// CDP-проверка «ПАРТИИ B»: инвентарь, панели врагов, сводка, очередь, амулет/кольцо, манекен и лавки.
// Запуск: node scripts/cdp-mm6-party-b.mjs
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
const profile = await mkdtemp(join(tmpdir(), 'mm6-party-b-'));
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

  await send('Page.navigate', { url: base + '/games/mm6/index.html' });
  await waitFor('!!window.__mm6Debug', 8000);
  const play = await ev(`(()=>{const r=document.getElementById('ul-play').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await click(play.x, play.y);
  await waitFor('!!window.__mm6State() && document.getElementById("unified-launch").classList.contains("ul-hidden")', 8000);
  check('игра запущена реальным кликом', await ev(`!!window.__mm6State()`));

  // 1. Инвентарь: фиксированная сетка 9×16 без прокрутки, стат-блоки +10%.
  await ev(`window.__mm6Debug.toggleInventory(true)`);
  await sleep(140);
  const inv = await ev(`(()=>{const g=document.querySelector('.invGrid'),s=getComputedStyle(g);
    const cell=s=>getComputedStyle(document.querySelector(s));
    return {cells:g.querySelectorAll('.invCell').length,columns:s.gridTemplateColumns.split(' ').length,
      overflow:s.overflow,scrollH:g.scrollHeight,clientH:g.clientHeight,
      stats:[cell('.mq-stats').minHeight,cell('.mq-stats').maxHeight],
      desc:[cell('.mq-desc').minHeight,cell('.mq-desc').maxHeight],
      detail:[cell('.invDetail').minHeight,cell('.invDetail').maxHeight],
      log:cell('#logList').maxHeight};})()`);
  check('инвентарь: сетка 9×16 без скролла, 144 ячейки',
    inv.cells === 144 && inv.columns === 9 && inv.overflow === 'hidden' && inv.scrollH === inv.clientH,
    JSON.stringify(inv));
  check('стат-окна и описания увеличены на 10%',
    inv.stats[0] === '141px' && inv.stats[1] === '141px' &&
    inv.desc[0] === '53px' && inv.desc[1] === '53px' &&
    inv.detail[0] === '46px' && inv.detail[1] === '46px' && inv.log === '97px',
    JSON.stringify({ stats: inv.stats, desc: inv.desc, detail: inv.detail, log: inv.log }));
  const invBox = await ev(`(()=>{const s=getComputedStyle(document.querySelector('#inventory>.box'));
    return {max:parseFloat(s.maxHeight),expected:window.innerHeight*0.98,
      tabs:[...document.querySelectorAll('#invTabs [data-tab]')].map(b=>b.dataset.tab)};})()`);
  check('окно инвентаря выше базового и без мёртвой вкладки «Сундуки»',
    invBox.max >= invBox.expected - 2 && !invBox.tabs.includes('Сундуки'),
    JSON.stringify({ max: invBox.max, expected: invBox.expected, tabs: invBox.tabs }));

  const capacity = await ev(`(()=>{const d=window.__mm6Debug,g=window.__mm6State(),start=g.bag.length,uids=[];
    for(let i=0;i<145;i++){
      const uid=d.addItemBySpec({id:'b-cap-'+i,type:'note',name:'Заполнитель '+i,icon:'•',cost:0,sell:0});
      if(uid) uids.push(uid);
    }
    const r=d.inventoryGridReport(), note=document.querySelectorAll('#invList .invNote').length;
    uids.forEach(uid=>{const ix=g.bag.findIndex(x=>x.uid===uid);if(ix>=0)g.bag.splice(ix,1);});
    d.toggleInventory(true);
    return {added:uids.length,items:r.items,note};})()`);
  check('свыше 144 клеток предметы не добавляются и не прячутся',
    capacity.added === 144 && capacity.items === 144 && capacity.note === 0,
    JSON.stringify(capacity));

  const chestUid = await ev(`window.__mm6Debug.addCatalogItem('chest_plain')`);
  const bagUid = await ev(`window.__mm6Debug.addCatalogItem('bag_plain')`);
  await sleep(120);
  const containerUi = await ev(`(()=>({
    titles:[...document.querySelectorAll('.invGrid .invCell:not(.empty)')].map(b=>b.title),
    strips:[...document.querySelectorAll('#invList .invSlotStrip[data-section="containers"]')].map(s=>s.textContent),
    bag:window.__mm6State().bag.filter(i=>i.type==='container').map(i=>i.name)
  }))()`);
  check('сундук и мешок только в разделе ёмкостей',
    !!chestUid && !!bagUid && containerUi.bag.length >= 2 &&
    !containerUi.titles.some(t => /Сундук|Мешок/i.test(t)) &&
    containerUi.strips.length === 1 && /Сундук/i.test(containerUi.strips[0]) && /Мешок/i.test(containerUi.strips[0]),
    JSON.stringify({ bag: containerUi.bag, inGrid: containerUi.titles.filter(t => /Сундук|Мешок/i.test(t)), strips: containerUi.strips }));

  // 2. Сводка отряда: по строке на героя, единообразные ячейки.
  const summary = await ev(`window.__mm6Debug.partySummaryReport()`);
  const summaryStyles = await ev(`(()=>{const rows=[...document.querySelectorAll('#partySummary .ps-row[data-hero]')];
    return {names:rows.map(r=>getComputedStyle(r.querySelector('.ps-name')).fontSize),
      values:rows.map(r=>getComputedStyle(r.querySelector('b')).fontSize)};})()`);
  check('сводка отряда: по строке на героя', summary.rows.length === 3 &&
    summary.rows.every((r, i) => r.hero === i && r.cells === 5) &&
    summary.rows.every((r, i) => !i || r.y > summary.rows[i - 1].y),
    JSON.stringify(summary.rows));
  check('строки сводки оформлены одинаково',
    new Set(summaryStyles.names).size === 1 && new Set(summaryStyles.values).size === 1 &&
    new Set(summary.rows.map(r => r.color)).size === 3,
    JSON.stringify({ styles: summaryStyles, colors: summary.rows.map(r => r.color) }));

  // 3. Манекен: надетые вещи рисуются поверх силуэта теми же SVG.
  const doll = await ev(`window.__mm6Debug.paperDollReport()`);
  const required = ['helmet', 'body', 'legs', 'boots', 'hands', 'belt', 'pouch', 'amulet', 'ring'];
  const dollImages = await ev(`[...document.querySelectorAll('#mannequin .mq-worn img')].map(i=>i.getAttribute('src'))`);
  check('манекен: все слоты и слой надетых вещей', required.every(id => doll.slots.includes(id)) &&
    doll.slotsInDom.length === doll.slots.length && doll.layers.length > 0 &&
    doll.layers.every(l => l.images > 0),
    JSON.stringify({ slots: doll.slots, layers: doll.layers.length, dom: doll.slotsInDom.length }));
  check('слой экипировки не добавляет новые файлы',
    dollImages.length > 0 && dollImages.every(src => /^\.\.\/\.\.\/assets\//.test(src)),
    JSON.stringify(dollImages));

  const beltUid = await ev(`window.__mm6Debug.addCatalogItem('belt_plain')`);
  const pouchUid = await ev(`window.__mm6Debug.addCatalogItem('purse_plain')`);
  await ev(`(()=>{
    document.querySelector('[data-container-item="${beltUid}"]').click();
    document.querySelector('[data-container-item="${pouchUid}"]').click();
    return true;})()`);
  const wornContainers = await ev(`(()=>{const h=window.__mm6State().party[0];
    return {belt:h.equip.belt,pouch:h.equip.pouch,report:window.__mm6Debug.paperDollReport()};})()`);
  check('пояс и мошна надеваются через секцию ёмкостей и видны на манекене',
    wornContainers.belt === beltUid && wornContainers.pouch === pouchUid &&
    ['belt', 'pouch'].every(slot => wornContainers.report.layers.some(l => l.slot === slot && l.images > 0)),
    JSON.stringify({ belt: wornContainers.belt, pouch: wornContainers.pouch,
      layers: wornContainers.report.layers.filter(l => ['belt', 'pouch'].includes(l.slot)) }));

  // 4. Амулет идёт только в «Амулет», кольцо наконец экипируется.
  const amuletUid = await ev(`window.__mm6Debug.addItemBySpec({type:'weapon',name:'Амулет',wkind:'amulet',dmg:2,cost:24,sell:12,icon:'◈'})`);
  const ringUid = await ev(`window.__mm6Debug.addItemBySpec({type:'weapon',name:'Кольцо (1 ур.)',wkind:'ring',dmg:1,cost:12,sell:6,icon:'◯'})`);
  const amuletOk = await ev(`window.__mm6Debug.equipByUid('${amuletUid}',null)`);
  const ringOk = await ev(`window.__mm6Debug.equipByUid('${ringUid}',null)`);
  const gear = await ev(`(()=>{const h=window.__mm6State().party[0];return {amulet:h.equip.amulet,ring:h.equip.ring,weapon:h.equip.weapon};})()`);
  check('амулет экипируется только в слот «Амулет»', amuletOk && gear.amulet === amuletUid && gear.weapon !== amuletUid,
    JSON.stringify({ amuletUid, gear }));
  check('кольцо экипируется в отдельный слот', ringOk && gear.ring === ringUid,
    JSON.stringify({ ringUid, gear }));
  const amuletOffUid = await ev(`window.__mm6Debug.addItemBySpec({id:'b-amulet-off',type:'weapon',name:'Амулет',wkind:'amulet',dmg:2,cost:24,sell:12,icon:'◈'})`);
  const offhandAmulet = await ev(`(()=>{const d=window.__mm6Debug,ok=d.equipByUid('${amuletOffUid}','offhand'),h=window.__mm6State().party[0];
    return {ok,amulet:h.equip.amulet,offhand:h.equip.offhand,weapon:h.equip.weapon};})()`);
  check('выбор «Второй руки» не переводит амулет в руки',
    offhandAmulet.ok && offhandAmulet.amulet === amuletOffUid &&
    offhandAmulet.offhand !== amuletOffUid && offhandAmulet.weapon !== amuletOffUid,
    JSON.stringify(offhandAmulet));

  await ev(`window.__mm6Debug.toggleInventory(false)`);

  // 5. Очередь: вертикальный список, активная строка сверху и подсветка цветом героя.
  await ev(`(()=>{const g=window.__mm6State();g.battle=null;
    const list=['Мышь','Мышь'].map(name=>({name,alive:true,hp:1000,maxHp:1000,atk:1,defVal:1,speed:1,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);return true;})()`);
  await sleep(180);
  const queue = await ev(`window.__mm6Debug.turnQueueReport()`);
  check('очередь ходов — вертикальный список с активной верхней строкой',
    queue.visible && queue.rows.length >= 3 && queue.rows[0].active &&
    queue.rows.every((r, i) => !i || r.y > queue.rows[i - 1].y) &&
    queue.rows[0].animation === 'tq-rise',
    JSON.stringify(queue.rows.map(r => ({ side: r.side, name: r.name, active: r.active, y: r.y, animation: r.animation }))));
  check('полные имена классов и нумерация одинаковых врагов',
    queue.enemyNames.join('|') === 'Мышь 1|Мышь 2' &&
    queue.rows.some(r => r.side === 'enemy' && /МЫШЬ [12]/.test(r.name)) &&
    JSON.stringify(queue.classNames) === JSON.stringify(await ev(`window.__mm6State().party.map(h=>h.def.name)`)),
    JSON.stringify({ classes: queue.classNames, enemies: queue.enemyNames, rows: queue.rows.map(r => r.name) }));
  check('цвет активной строки — цвет героя', /rgb\(/.test(queue.rows[0].color),
    JSON.stringify({ color: queue.rows[0].color }));
  await ev(`(()=>{const g=window.__mm6State(),b=g.battle;
    b.enemies[0].alive=false; b.enemies[0].hp=0;
    b.units.forEach(u=>{if(u.side==='enemy'&&u.idx===0)u.next=9999;});
    window.__mm6Debug.setPartyGold(g.gold); return true;})()`);
  const afterDeath = await ev(`window.__mm6Debug.turnQueueReport()`);
  check('смерть одного врага не сдвигает номера остальных',
    afterDeath.rows.filter(r => r.side === 'enemy').map(r => r.name).join('|') === 'МЫШЬ 2',
    JSON.stringify({ enemies: afterDeath.rows.filter(r => r.side === 'enemy').map(r => r.name), labels: afterDeath.enemyNames }));

  // 6. Имя и HP врага не перекрываются даже у длинного названия.
  await ev(`(()=>{const g=window.__mm6State();g.battle=null;
    window.__mm6Debug.startBattle([{name:'Предводитель Элитный Скелет',alive:true,hp:1000,maxHp:1000,atk:3,defVal:2,speed:1,def:{},gold:[0,0]}]);return true;})()`);
  await sleep(140);
  const hud = await ev(`window.__mm6Debug.battleHudReport()`);
  check('длинное имя врага не заходит на HP',
    !hud.nameHp.overlap && hud.nameHp.name.width <= hud.nameHp.name.maxW,
    JSON.stringify(hud.nameHp));
  await ev(`window.__mm6Debug.closeBattle()`);
  const closed = await ev(`window.__mm6Debug.turnQueueReport()`);
  check('очередь скрывается при закрытии боя', closed === null || !closed.visible,
    JSON.stringify(closed && { visible: closed.visible, rows: closed.rows.length }));

  // 7. Плашки врагов на карте: только долгое наведение или удержание.
  await ev(`(()=>{const g=window.__mm6State(),m=g.world.maps[g.world.current],p=g.player;
    Object.assign(p,{x:10,y:10,px:10,py:10,dir:0,moveT:0});
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)m.seen.add((10+dx)+','+(10+dy));
    m.monsters.length=0;
    m.monsters.push({x:10,y:10,name:'Дозор',alive:true,hp:50,maxHp:50,atk:1,defVal:0,speed:1,def:{},gold:[0,0]});
    g.msg='Карта';return true;})()`);
  await sleep(160);
  const idle = await ev(`window.__mm6Debug.mapEnemyPanelsReport()`);
  check('плашки врагов не висят постоянно', idle.panels.length === 1 && !idle.panels[0].shown && !idle.focus.has,
    JSON.stringify({ shown: idle.panels.map(p => p.shown), focus: idle.focus }));
  await ev(`window.__mm6Debug.focusMapEnemy(0,false)`);
  const early = await ev(`window.__mm6Debug.mapEnemyPanelsReport()`);
  check('короткое наведение плашку не показывает', !early.panels[0].shown, JSON.stringify(early.focus));
  await sleep(520);
  const hovered = await ev(`window.__mm6Debug.mapEnemyPanelsReport()`);
  check('долгое наведение показывает имя/HP отдельными строками', hovered.panels[0].shown &&
    hovered.panels[0].layout.nameY < hovered.panels[0].layout.barY &&
    hovered.panels[0].layout.hpY > hovered.panels[0].layout.barY,
    JSON.stringify({ shown: hovered.panels[0].shown, layout: hovered.panels[0].layout }));
  await ev(`window.__mm6Debug.clearMapEnemy()`);
  await sleep(60);
  check('увод курсора скрывает плашку', !(await ev(`window.__mm6Debug.mapEnemyPanelsReport().panels[0].shown`)));
  await ev(`window.__mm6Debug.focusMapEnemy(0,true)`);
  await sleep(60);
  const held = await ev(`window.__mm6Debug.mapEnemyPanelsReport()`);
  check('удержание показывает плашку сразу', held.panels[0].shown && held.focus.held,
    JSON.stringify({ shown: held.panels[0].shown, focus: held.focus }));
  await ev(`window.__mm6Debug.clearMapEnemy()`);

  // 8. Лавки: точный заголовок, разбивка справа, вкладка «Продажа», имена из каталога.
  const magic = await ev(`window.__mm6Debug.forceShop('magic')`);
  check('магическая лавка: точный заголовок и разбивка справа',
    magic && magic.ok && magic.displayedTitle === 'Магазин Магии' &&
    magic.categories.length > 1 && magic.categories.some(c => c.rows > 0),
    JSON.stringify({ title: magic && magic.displayedTitle, categories: magic && magic.categories.map(c => c.title), errors: magic && magic.errors }));
  check('внизу лавки есть вкладка «Продажа»', magic.saleTab && !magic.saleOnly, JSON.stringify({ saleTab: magic.saleTab }));
  const armory = await ev(`window.__mm6Debug.forceShop('armory')`);
  const shopNames = await ev(`[...document.querySelectorAll('#shopList .rowItem .info b')].map(b=>b.textContent)`);
  check('названия товаров несут качество/стихии каталога',
    armory && armory.ok && shopNames.some(n => /Ржавый|Острый|пламени|света|крови|льда|воды|земли|ветра|дым/i.test(n)),
    JSON.stringify(shopNames.slice(0, 6)));
  const market = await ev(`window.__mm6Debug.forceShop('market')`);
  const potionCat = market && market.categories.find(c => /Зелья и товары/.test(c.title));
  check('зелья рынка попадают в свой раздел разбивки', !!potionCat && potionCat.rows >= 2,
    JSON.stringify({ potionCat, categories: market && market.categories.map(c => ({ title: c.title, rows: c.rows })) }));
  await ev(`window.__mm6Debug.forceShop('armory')`);
  await ev(`window.__mm6Debug.toggleShopSale()`);
  await sleep(120);
  const sale = await ev(`window.__mm6Debug.shopReport()`);
  const saleSections = await ev(`[...document.querySelectorAll('#shopList .sec')].map(e=>e.textContent)`);
  check('вкладка «Продажа» показывает только продажу', sale.saleOnly &&
    saleSections.length === 1 && /Продажа/.test(saleSections[0]),
    JSON.stringify({ saleOnly: sale.saleOnly, sections: saleSections }));
  await ev(`window.__mm6Debug.forceShop('market')`);

  check('консоль без ошибок', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('нет 4xx/5xx', badResponses.length === 0, JSON.stringify(badResponses));
  console.log(failures ? `PARTY B CHECKS FAILED (${failures})` : 'PARTY B CHECKS PASSED');
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
