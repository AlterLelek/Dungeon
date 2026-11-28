// CDP-проверка десятой части: сквозное покрытие всех этапов «НОЧНОЙ ПАРТИИ»
// и свежая передача ассетов. Запуск: node scripts/cdp-mm6-final-p10.mjs
import { existsSync, readFileSync } from 'node:fs';
import { runCdp } from './cdp-lib.mjs';

// Харнесы, где закреплены проверки соответствующих частей.
const COVERAGE = Object.freeze({
  1: 'cdp-mm6-buildings-p1.mjs',
  2: 'cdp-mm6-buildings-p2.mjs',
  3: 'cdp-mm6-portraits-p3.mjs',
  4: 'cdp-mm6-world-p4.mjs',
  5: 'cdp-mm6-ui-p2.mjs',
  6: 'cdp-mm6-shop-p6.mjs',
  7: 'cdp-mm6-inventory-p7.mjs',
  8: 'cdp-mm6-audio-p8.mjs',
  9: 'cdp-mm6-death-p9.mjs',
  10: 'cdp-mm6-final-p10.mjs'
});

runCdp('FINAL PART 10', async api => {
  await api.startGame();

  // Части 1 и 2: один проход по всем фасадам даёт и стиль, и вывески.
  const buildings = await api.ev(`(async()=>{
    const batch=await fetch('${api.base}/assets/buildings-batch.json').then(r=>r.json());
    const rows=[];
    for(const entry of batch){
      const text=await fetch('${api.base}/'+entry.path).then(r=>r.text());
      const doc=new DOMParser().parseFromString(text,'image/svg+xml');
      const sign=doc.querySelector('#sign'), glyph=doc.querySelector('#sign [data-sign]');
      rows.push({
        stem:entry.path.split('/').pop().replace(/\\.svg$/,''),
        floors:entry.floors, batchName:entry.sign_text, batchIcon:entry.sign_icon,
        glyph:glyph&&glyph.getAttribute('data-sign'),
        signName:sign&&sign.getAttribute('data-sign-name'),
        signType:sign&&sign.getAttribute('data-sign-type'),
        signShop:sign&&sign.getAttribute('data-sign-shop'),
        signLines:[...doc.querySelectorAll('#sign text')].map(t=>t.textContent),
        layers:['base','chimney','roof','sign','door','window']
          .filter(id=>!!doc.querySelector('#'+id)).length,
        bad:/linearGradient|radialGradient|<filter|<image|\\.png/i.test(text)
      });
    }
    return rows;
  })()`);
  const twoFloor = buildings.filter(r => r.floors === 2).map(r => r.stem).sort().join(',');
  api.check('Часть 1 — 14 фасадов из базы и слоёв, без градиентов и PNG',
    buildings.length === 14 && buildings.every(r => r.layers === 6 && !r.bad) &&
    twoFloor === 'inn_0,tavern_0',
    JSON.stringify({ count: buildings.length, bad: buildings.filter(r => r.bad).map(r => r.stem), twoFloor }));

  const signKeys = { forge_0: 'anvil', armory_0: 'sword', magic_0: 'potion_star',
    tavern_0: 'mug', barn_0: 'sheaf', well_0: 'bucket' };
  api.check('Часть 2 — вывески соответствуют типу лавки и названию в батче',
    buildings.every(r => r.glyph && r.signName === r.batchName &&
      r.signLines.length === 2 && r.signLines[0] === r.signType &&
      r.signLines[1] === r.signShop &&
      r.signType + ' «' + r.signShop + '»' === r.batchName && !r.signShop.includes('…')) &&
    Object.entries(signKeys).every(([stem, icon]) =>
      buildings.some(r => r.stem === stem && r.glyph === icon)),
    JSON.stringify(buildings.filter(r => !r.glyph || r.signName !== r.batchName ||
      r.signType + ' «' + r.signShop + '»' !== r.batchName).map(r => r.stem)));

  // Фиксируем генерацию мира, как и в харнесе части 4: проверки не зависят от удачи.
  await api.ev(`(()=>{Math.random=()=>0.5;
    window.__mm6Debug.startGame('normal',[0,1,2]);return true;})()`);
  await api.waitFor(`!!window.__mm6State() && window.__mm6State().world.count>0`, 8000);

  // Часть 3.
  await api.waitFor(`(()=>{const c=window.__mm6Debug.portraitReport().cards;
    return c.length===3&&c.every(x=>x.loaded);})()`, 8000);
  const portraits = await api.ev(`(async()=>{
    const manifest=await fetch('${api.base}/assets/manifest.json').then(r=>r.json());
    return {entries:manifest.filter(e=>e.type==='portrait').length,
      cards:window.__mm6Debug.portraitReport().cards};})()`);
  api.check('Часть 3 — 40 портретов в манифесте и медальоны в отряде',
    portraits.entries === 40 && portraits.cards.length === 3 &&
    portraits.cards.every(c => c.loaded && /\/assets\/sprites\/portraits\//.test(c.src)),
    JSON.stringify({ entries: portraits.entries, cards: portraits.cards.map(c => c.src) }));

  // Часть 4.
  const world = await api.ev(`window.__mm6Debug.accessReport()`);
  api.check('Часть 4 — компактный двор, дороги и объекты доступны на всех картах',
    world.ok === true && world.rows.length > 0 &&
    world.rows.every(r => r.edgeRoads > 0 && r.unreachable === 0 &&
      r.clusterSpread <= 4 && r.connected === r.buildings),
    JSON.stringify({ ok: world.ok, errors: world.errors, maps: world.rows.length }));

  // Часть 5.
  await api.ev(`(()=>{const list=['Черт','Скелет','Паук','Мышь','Волк','Зомби']
    .map(name=>({name,alive:true,hp:100000,maxHp:100000,atk:1,defVal:1,speed:1,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(100);
  const hud = await api.ev(`window.__mm6Debug.battleHudReport()`);
  const queue = await api.ev(`window.__mm6Debug.turnQueueReport()`);
  api.check('Часть 5 — компактный HUD и очередь не более пяти строк',
    !!hud && hud.panel.w >= 216 && hud.panel.w <= 224 &&
    hud.party.length === 3 && hud.party.every(c => c.h >= 64 && c.h <= 76) &&
    queue.visible && queue.limit === 5 && queue.rows.length === 5 &&
    queue.total > queue.limit && queue.more,
    JSON.stringify({ panel: hud && hud.panel, cards: hud && hud.party.map(c => c.h),
      queue: { total: queue.total, limit: queue.limit, rows: queue.rows.length, more: queue.more } }));
  await api.ev(`window.__mm6Debug.closeBattle()`);

  // Часть 9: отдельный бой с двумя врагами, чтобы павший герой остался в очереди.
  await api.ev(`(()=>{const list=['Мышь','Мышь'].map(name=>({name,alive:true,hp:1000,maxHp:1000,
    atk:1,defVal:1,speed:1,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);window.__mm6Debug.setHeroHp(0,0);return true;})()`);
  await api.sleep(90);
  const corpse = await api.ev(`window.__mm6Debug.drawBattleNow()`);
  const deadQueue = await api.ev(`window.__mm6Debug.turnQueueReport()`);
  await api.ev(`window.__mm6Debug.closeBattle()`);
  const church = await api.ev(`(()=>{const d=window.__mm6Debug,g=window.__mm6State();
    d.setPartyGold(500);d.setHeroHp(0,0);
    g.shopOpen=true; g.shopType='church'; g.shopKinds=['church'];
    const before=g.gold, report=d.churchReport(), ok=d.resurrectAtChurch();
    return {ok,before,after:g.gold,hp:g.party[0].hp,costs:report.costs};})()`);
  const deadRow = deadQueue && deadQueue.rows.find(r => r.side === 'hero' && r.hero === 0);
  api.check('Часть 9 — тело до конца боя, зачёркнутый ход и десятина за воскрешение',
    !!corpse && corpse.inBattle && corpse.ended === false && corpse.drawn.includes(0) &&
    !!deadRow && deadRow.dead === true && deadRow.active === false &&
    /line-through/.test(deadRow.decoration) &&
    church.ok === true && church.before - church.after === 50 && church.hp > 0 &&
    church.costs.at0 === 10 && church.costs.at500 === 50,
    JSON.stringify({ drawn: corpse && corpse.drawn, deadRow, cost: church.before - church.after, hp: church.hp }));

  // Часть 6.
  const shop = await api.ev(`(()=>{const report=window.__mm6Debug.forceShop('weapons');
    return {report,dom:[...document.querySelectorAll('#shopTabs [data-shop-tab]')]
      .map(b=>b.dataset.shopTab)};})()`);
  const saleSlot = await api.ev(`(()=>({
    header:[...document.querySelectorAll('#shopTabs button')].some(b=>b.dataset.sale==='1'),
    bottom:[...document.querySelectorAll('#shopList button')].some(b=>b.dataset.sale==='1')
  }))()`);
  const ids = ['weapons', 'armor', 'magic', 'stones', 'herbs', 'sale'];
  api.check('Часть 6 — шесть вкладок в шапке и продажа как полная вкладка',
    !!shop.report && shop.report.tabs.length === 6 &&
    JSON.stringify(shop.report.tabs.map(t => t.id)) === JSON.stringify(ids) &&
    JSON.stringify(shop.dom) === JSON.stringify(ids) &&
    saleSlot.header === true && saleSlot.bottom === false,
    JSON.stringify({ tabs: shop.dom, saleSlot }));

  // Часть 7.
  await api.ev(`(()=>{window.__mm6Debug.toggleShop(false);
    window.__mm6Debug.toggleInventory(true);return true;})()`);
  await api.sleep(100);
  const grid = await api.ev(`window.__mm6Debug.inventoryGridReport()`);
  const inv = await api.ev(`window.__mm6Debug.inventoryPart7Report()`);
  api.check('Часть 7 — сетка 9×16 и три уровня мастерства ёмкостей',
    grid.columns === 9 && grid.rows === 16 && grid.cells === 144 &&
    inv.containers.length === 5 && inv.containers.every(c =>
      /Простой|Изысканный|Волшебный/.test(c.label) && /\d+\/\d+/.test(c.label)),
    JSON.stringify({ grid: { columns: grid.columns, rows: grid.rows, cells: grid.cells },
      labels: inv.containers.map(c => c.label) }));

  // Часть 8.
  const audio = await api.ev(`(()=>{const d=window.__mm6Debug;
    d.resetAudioFx();d.resetAudioStats();d.fireSfx('hit');d.fireSfx('flame','flame');d.fireSfx('coins');
    return d.audioPart8Report();})()`);
  api.check('Часть 8 — 15 звуков, 64 голоса и вспышка цветом школы',
    audio.events.length === 15 && audio.voiceLimit === 64 &&
    audio.engine.ready === true && audio.engine.voiceLimit === 64 &&
    ['hit', 'flame', 'coins'].every(e => audio.recent.includes(e)) &&
    audio.engine.playedVoices >= 3 && audio.fx.flashes === 1 &&
    audio.speechControl === true,
    JSON.stringify({ events: audio.events.length, limit: audio.voiceLimit,
      played: audio.engine.playedVoices, flashes: audio.fx.flashes, recent: audio.recent }));

  // Часть 10: все предыдущие харнесы на месте, а передача ассетов пересобрана.
  const files = Object.values(COVERAGE).map(name => `scripts/${name}`);
  const missing = files.filter(file => !existsSync(file) || readFileSync(file, 'utf8').length < 80);
  const design = readFileSync('docs/DESIGN.md', 'utf8');
  const handoff = readFileSync('docs/ASSET_HANDOFF.md', 'utf8');
  api.check('Часть 10 — CDP-покрытие всех десяти частей и свежая передача ассетов',
    missing.length === 0 && /cdp-mm6-final-p10\.mjs/.test(design) &&
    /Всего: \*\*1032 SVG\*\* и \*\*275 PNG\*\*/.test(handoff) &&
    !/\*\*1020 SVG\*\*/.test(handoff),
    JSON.stringify({ missing, design: /cdp-mm6-final-p10\.mjs/.test(design),
      handoff: (handoff.match(/Всего:.*/) || [''])[0] }));
});
