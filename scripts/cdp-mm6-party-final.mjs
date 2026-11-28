// Часть 8: сквозная CDP-проверка восьмичастной текущей «ПАРТИИ».
// Один проход по всем этапам: HUD, данные карты, качество предметов, вывески,
// NPC, рельеф, крупные кнопки и свежая документация. Запуск:
// node scripts/cdp-mm6-party-final.mjs
import { existsSync, readFileSync } from 'node:fs';
import { runCdp } from './cdp-lib.mjs';

// Все сквозные харнесы ПАРТИИ: новые проверки [ГОБОРЕНО] и их прежние аналоги.
const PARTS = Object.freeze({
  1: ['cdp-mm6-battle-hud-part1.mjs', 'cdp-mm6-battle-hud-v2.mjs', 'cdp-mm6-window-persistence.mjs'],
  2: ['cdp-mm6-map-info-part2.mjs', 'cdp-mm6-map-info.mjs'],
  3: ['cdp-mm6-items-icons-part3.mjs', 'cdp-mm6-items-icons.mjs'],
  4: ['cdp-mm6-signs-layout-part4.mjs', 'cdp-mm6-signs-layout.mjs', 'cdp-mm6-buildings-render.mjs'],
  5: ['cdp-mm6-npc-dialogue-part5.mjs', 'cdp-mm6-npc-dialogue.mjs'],
  6: ['cdp-mm6-terrain-render-part6.mjs', 'cdp-mm6-terrain-render.mjs'],
  7: ['cdp-mm6-touch-controls-part7.mjs', 'cdp-mm6-touch-controls.mjs'],
  8: ['cdp-mm6-party-final.mjs']
});
const GLOBAL = Object.freeze(['cdp-mm6-no-overlap.mjs']);

const center = (api, selector) => api.ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});
  if(!e||!e.getClientRects().length) return null;
  const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);

async function press(api, selector) {
  const p = await center(api, selector);
  if (!p) throw new Error('кнопка не найдена: ' + selector);
  await api.click(p.x, p.y);
  await api.sleep(80);
}

runCdp('PARTY FINAL PART 8', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0,1,2])`);
  await api.waitFor('!!window.__mm6State() && window.__mm6State().world.count>0', 8000);
  await api.viewport(1280, 720);
  await api.sleep(500);

  // Часть 1: компактный HUD боя, полные имена и значки статов в карточках.
  await api.ev(`(()=>{const list=['Черт','Скелет','Зелёный Паук'].map(name=>({name,alive:true,
    hp:1000,maxHp:1000,atk:1,defVal:1,speed:1,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(180);
  const hud = await api.ev('window.__mm6Debug.battleHudReport()');
  const queue = await api.ev('window.__mm6Debug.turnQueueReport()');
  const stats = await api.ev(`(()=>[...document.querySelectorAll('#party.in-battle .pcard .pstats i')]
    .map(i=>i.textContent))()`);
  api.check('Часть 1 — HUD 235×62, три карточки 64–76 px, полные имена и статы значками',
    hud.panel.w >= 231 && hud.panel.w <= 239 && hud.panel.h >= 60 && hud.panel.h <= 64 &&
    hud.party.length === 3 && hud.party.every(c => c.h >= 64 && c.h <= 76 &&
      !!c.name && !c.name.includes('…') && !c.nameClipped && !c.statsClipped) &&
    stats.length === 12 && stats.every(s => /^[⚔🛡✨⚡]/.test(s)) &&
    queue.visible && queue.rows.length <= 5 && queue.limit === 5 &&
    await api.ev(`document.getElementById('turnQueue').getBoundingClientRect().width`) <= 96,
    JSON.stringify({ panel: hud.panel, cards: hud.party.map(c => ({ h: c.h, name: c.name })),
      stats: stats.length, rows: queue.rows.length }));

  const battleOverlap = await api.ev(`(()=>{window.__mm6Debug.showToast('Сквозная проверка ПАРТИИ');
    return new Promise(r=>setTimeout(()=>r(window.__mm6Debug.overlapReport()),340));})()`);
  api.check('Глобально — в бою ни одно окно, плашка и сообщение не перекрывают другое',
    battleOverlap.overlaps.length === 0 &&
    ['enemyPanel', 'turnBadge', 'logWindow', 'turnQueue', 'party', 'toast']
      .every(n => battleOverlap.rects.some(r => r.name === n)),
    JSON.stringify({ rects: battleOverlap.rects.map(r => r.name), overlaps: battleOverlap.overlaps }));
  await api.ev('window.__mm6Debug.closeBattle()');
  await api.sleep(120);

  // Часть 2: вертикальная колонка данных, подпись только карты, непересечения на всех размерах.
  const state = await api.ev(`(()=>({report:window.__mm6Debug.mapStateWindowReport(),
    caption:window.__mm6Debug.minimapCaptionReport()}))()`);
  api.check('Часть 2 — окно состояния 214×56 и пять данных вертикальной колонкой',
    !!state.report && state.report.panel.w === 214 && state.report.panel.h === 56 &&
    state.report.rows.length === 5 && state.report.rowYs.length === 5 &&
    state.report.rowYs.every((y, i) => i === 0 || y > state.report.rowYs[i - 1]) &&
    state.report.bottomLine === null,
    JSON.stringify({ panel: state.report && state.report.panel, rows: state.report && state.report.rows,
      rowYs: state.report && state.report.rowYs }));
  api.check('Часть 2 — подпись миникарты говорит только о карте',
    /весь мир/.test(state.caption || '') &&
    !/(Каменный Брод|Березоречье|Седая Гать|Овинец|Криничный Дол)/.test(state.caption || ''),
    JSON.stringify({ caption: state.caption }));
  for (const [vw, vh] of [[800, 600], [1280, 720], [1024, 768], [640, 900]]) {
    await api.viewport(vw, vh);
    await api.sleep(160);
    const mapView = await api.ev('window.__mm6Debug.overlapReport()');
    const minimap = mapView.rects.find(r => r.name === 'minimap');
    const party = mapView.rects.find(r => r.name === 'party');
    const ox = minimap && party ? Math.min(minimap.x + minimap.w, party.x + party.w) - Math.max(minimap.x, party.x) : 0;
    const oy = minimap && party ? Math.min(minimap.y + minimap.h, party.y + party.h) - Math.max(minimap.y, party.y) : 0;
    api.check(`Глобально — карта без пересечений и с открытой мини-картой при ${vw}×${vh}`,
      mapView.overlaps.length === 0 && !!minimap && !!party && !(ox > 1 && oy > 1),
      JSON.stringify({ overlaps: mapView.overlaps, ox, oy }));
  }
  await api.viewport(1280, 720);
  await api.sleep(160);

  // Часть 3: кляксы по силуэту, блики, кромка, мерцание и мягкие ауры школ.
  const items = await api.ev(`(()=>{const d=window.__mm6Debug, all=d.allItemLayers();
    const bad=all.filter(e=>{const r=e.layers.map(l=>l.role), b=r.indexOf('base');
      return b!==r.filter(x=>x==='backdrop').length || r[r.length-1]!=='quality' ||
        r.filter(x=>x==='base').length!==1 || r.filter(x=>x==='quality').length!==1;});
    return {report:d.itemsReport(),total:all.length,bad:bad.map(e=>e.id)};})()`);
  api.check('Часть 3 — 202 предмета, база на подложке и маска качества сверху',
    items.report.count === 202 && items.report.ok && items.report.qualityPaths.length === 4 &&
    items.total === 202 && items.bad.length === 0,
    JSON.stringify({ count: items.report.count, quality: items.report.qualityPaths.length,
      bad: items.bad.slice(0, 5) }));
  const fx = await api.ev(`(async()=>{
    const urls=[...new Set(window.__mm6Debug.allItemLayers().flatMap(e=>e.layers.map(l=>l.src)))];
    const texts=await Promise.all(urls.map(u=>fetch(u).then(r=>r.text())));
    const q={},el={};
    texts.forEach((t,n)=>{const u=urls[n];
      if(u.includes('/quality/')) q[u.split('/').pop().replace('.svg','')]={
        rust:/data-fx="rust-blots"/.test(t)&&(t.match(/<circle\\b/g)||[]).length>=12,
        glint:/data-fx="sharp-glint"/.test(t)&&t.includes('#ffffff')&&t.includes('#93c5fd'),
        edge:/data-fx="gold-edge-shine"/.test(t)&&t.includes('#e8c14a')&&/<ellipse\\b/.test(t),
        shimmer:/data-fx="magic-shimmer"/.test(t)&&(t.match(/<animate\\b/g)||[]).length>=4};
      if(u.includes('/elements/')) el[u.split('/').pop().replace('.svg','')]={
        school:(t.match(/data-school="([a-z]+)"/)||[])[1]||null,
        rings:(t.match(/<circle\\b/g)||[]).length,
        animate:/<animate\\b/.test(t)&&/school-aura/.test(t)};});
    return {q,el};})()`);
  api.check('Часть 3 — ржавчина кляксами, острый бликом, золото кромкой, магия мерцанием',
    Object.keys(fx.q).length === 4 && fx.q.rusty.rust && fx.q.sharp.glint &&
    fx.q.gold.edge && fx.q.magic.shimmer, JSON.stringify(fx.q));
  api.check('Часть 3 — шесть школ дают мягкие анимированные ауры',
    ['flame', 'water', 'earth', 'wind', 'dark', 'light'].every(id =>
      fx.el[id] && fx.el[id].school === id && fx.el[id].rings >= 3 && fx.el[id].animate) &&
    Object.keys(fx.el).length === 6, JSON.stringify(fx.el));

  // Часть 4: крупный читаемый знак слева и отдельный притон у колодца.
  const signs = await api.ev(`(async()=>{
    const batch=await fetch('${api.base}/assets/buildings-batch.json').then(r=>r.json());
    const texts=await Promise.all(batch.map(e=>fetch('${api.base}/'+e.path).then(r=>r.text())));
    const well=texts[batch.findIndex(e=>/well_/.test(e.path))]||'';
    return {count:batch.length,font40:texts.every(t=>/font-size="40"/.test(t)),
      glyphLeft:texts.every(t=>t.indexOf('data-sign=')>0&&
        t.indexOf('data-sign=')<t.indexOf('data-line="type"')),
      hatch:/data-part="den-hatch"/.test(well)&&/data-lair="bandit"/.test(well)&&
        !/data-part="hidden-entrance"/.test(well)};})()`);
  api.check('Часть 4 — 16 вывесок со шрифтом 40 и знаком слева; притон отдельным люком',
    signs.count === 16 && signs.font40 && signs.glyphLeft && signs.hatch,
    JSON.stringify(signs));

  // Часть 5: NPC в сцене, крупные портреты и непрерывные жесты.
  await api.ev(`window.__mm6Debug.npcSay('Кузнец говорит из сцены','Кузнец','forge')`);
  await api.sleep(120);
  const npc = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('Часть 5 — NPC говорит со спрайтом из пяти частей и портретом',
    !!npc && npc.visible && !npc.inShop && /Кузнец говорит/.test(npc.text || '') &&
    /\/portraits\//.test(npc.npcPortraitSrc || '') &&
    npc.world.visible && npc.world.kind === 'forge' && npc.world.groups.length === 5 &&
    npc.world.animationIterations.includes('infinite') &&
    npc.animationNames.some(n => n && n !== 'none'),
    JSON.stringify({ visible: npc && npc.visible, world: npc && npc.world.visible,
      groups: npc && npc.world.groups, animation: npc && npc.world.animationNames }));
  await api.ev('window.__mm6Debug.toggleBigMap(true)');
  await api.sleep(80);
  const onMap = await api.ev('window.__mm6Debug.npcStageReport()');
  api.check('Часть 5 — на большой карте лица отряда и спрайт NPC скрыты',
    onMap.mapFacesVisible === false && onMap.world.visible === false,
    JSON.stringify({ faces: onMap.mapFacesVisible, sprite: onMap.world.visible }));
  await api.ev('window.__mm6Debug.toggleBigMap(false)');
  await api.sleep(80);

  // Часть 6: органический рельеф, вьющиеся тропы и поле боя без просадок.
  const terrainBefore = await api.ev('window.__mm6Debug.terrainRenderReport()');
  await api.ev('window.__mm6Debug.toggleBigMap(true)');
  await api.sleep(240);
  const terrainOpen = await api.ev('window.__mm6Debug.terrainRenderReport()');
  const world = await api.ev('window.__mm6Debug.worldMapReport()');
  const cells = terrainOpen.world.reduce((n, m) => n + m.size * m.size, 0);
  api.check('Часть 6 — мозаика по всем клеткам, пятна, тропы и неизменная проходимость',
    terrainBefore.field.cached === true && terrainBefore.horizontalBands === false &&
    terrainBefore.performance.mapFrame.avg < 16 &&
    terrainOpen.bigMap.maps === world.count && terrainOpen.bigMap.cells === cells &&
    terrainOpen.bigMap.patches > 0 && terrainOpen.bigMap.trails > 0 &&
    terrainOpen.bigMap.winding > 0 && terrainOpen.bigMap.soft > 0 &&
    terrainOpen.passabilitySignature === terrainBefore.passabilitySignature,
    JSON.stringify({ cached: terrainBefore.field.cached,
      frameAvg: terrainBefore.performance.mapFrame.avg, maps: terrainOpen.bigMap.maps,
      cells: terrainOpen.bigMap.cells, expected: cells }));
  await api.ev('window.__mm6Debug.toggleBigMap(false)');
  await api.ev(`(()=>{window.__mm6Debug.startBattle(['Черт','Скелет','Зелёный Паук'].map(name=>({
    name,alive:true,hp:1000,maxHp:1000,atk:1,defVal:1,speed:1,def:{},gold:[0,0]})));return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(220);
  const field = await api.ev('window.__mm6Debug.terrainRenderReport()');
  api.check('Часть 6 — поле боя кэшировано, с пятнами и тропой, FPS не падает',
    field.battle.cached === true && field.battle.patches > 0 && field.battle.organic > 0 &&
    field.battle.trails > 0 && field.battle.transitions > 0 &&
    field.cache.battle > 0 && field.performance.battle.last < 16 &&
    field.passabilitySignature === terrainBefore.passabilitySignature,
    JSON.stringify({ battle: field.battle, cache: field.cache,
      last: field.performance.battle.last }));
  await api.ev('window.__mm6Debug.closeBattle()');
  await api.sleep(120);

  // Часть 7: крупные полупрозрачные кнопки, скрытие на ПК и постоянная видимость на тач-экране.
  const controls = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('Часть 7 — крупные кнопки видны на ПК, полупрозрачны и не пересекают HUD',
    controls.visible && controls.setting && !controls.hiddenClass &&
    controls.buttons['move-up'].rect.w >= 48 && controls.buttons.btnAttack.rect.h >= 44 &&
    controls.buttons['move-up'].alpha >= 0.2 && controls.buttons['move-up'].alpha <= 0.7 &&
    controls.overlaps.length === 0,
    JSON.stringify({ visible: controls.visible, setting: controls.setting,
      up: controls.buttons['move-up'], attack: controls.buttons.btnAttack,
      overlaps: controls.overlaps }));
  const beforeTurn = await api.ev(`(()=>{const p=window.__mm6State().player;return {dir:p.dir};})()`);
  await press(api, '#turnLeft');
  const afterTurn = await api.ev(`(()=>{const p=window.__mm6State().player;return {dir:p.dir};})()`);
  await press(api, '#btnInv');
  const openedByButton = await api.ev(`(()=>{const g=window.__mm6State();
    return {open:g.invOpen,visible:!document.getElementById('inventory').classList.contains('hidden')};})()`);
  api.check('Часть 7 — кнопки реально поворачивают и открывают инвентарь',
    afterTurn.dir === (beforeTurn.dir + 3) % 4 && openedByButton.open && openedByButton.visible,
    JSON.stringify({ before: beforeTurn.dir, after: afterTurn.dir, openedByButton }));
  await api.ev(`document.getElementById('invClose').click()`);
  await api.key('h');
  const hidden = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('Часть 7 — клавиша H скрывает кнопки и сохраняет выбор в настройке',
    !hidden.visible && !hidden.setting && hidden.hiddenClass, JSON.stringify({ visible: hidden.visible,
      setting: hidden.setting }));
  await api.touchViewport(390, 844);
  await api.sleep(200);
  const portrait = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('Глобально — на тач-экране кнопки остаются видимыми при скрытой настройке',
    portrait.touch && portrait.visible && portrait.hiddenClass && portrait.overlaps.length === 0,
    JSON.stringify({ touch: portrait.touch, visible: portrait.visible,
      overlaps: portrait.overlaps }));
  await api.touchViewport(844, 390);
  await api.sleep(200);
  const landscape = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('Глобально — в тач-ландшафте кнопки тоже видны и не пересекают HUD',
    landscape.touch && landscape.visible && landscape.overlaps.length === 0,
    JSON.stringify({ touch: landscape.touch, visible: landscape.visible,
      overlaps: landscape.overlaps }));
  await api.ev('window.__mm6Debug.setSettings({showControls:true})');
  await api.viewport(1280, 720);
  await api.sleep(160);

  // Часть 8: харнесы всех частей, документы и свежая передача ассетов.
  const missing = [...Object.values(PARTS).flat(), ...GLOBAL].map(f => 'scripts/' + f)
    .filter(f => !existsSync(f) || readFileSync(f, 'utf8').length < 80);
  const design = readFileSync('docs/DESIGN.md', 'utf8');
  const handoff = readFileSync('docs/ASSET_HANDOFF.md', 'utf8');
  const frozen = [
    'НИ ОДНО окно, плашка, сообщение или подсказка не перекрывают другое окно',
    '214×56', '235×62', '10 классов × 4 портрета', 'серые заглушки',
    'рельеф рисуется по данным клеток', 'крупные полупрозрачные кнопки',
    'тач-экране', 'cdp-mm6-party-final.mjs', '`[ГОБОРЕНО]`-харнес',
    'cdp-mm6-signs-layout-part4.mjs', 'cdp-mm6-touch-controls-part7.mjs',
    '`PARTS` перечисляет все харнесы'
  ];
  api.check('Часть 8 — все харнесы ПАРТИИ, замороженные решения и свежая передача ассетов',
    missing.length === 0 && frozen.every(s => design.includes(s)) &&
    /cdp-mm6-party-final\.mjs/.test(design) &&
    /Всего: \*\*1066 SVG\*\* и \*\*275 PNG\*\*/.test(handoff),
    JSON.stringify({ missing, design: frozen.filter(s => !design.includes(s)),
      handoff: (handoff.match(/Всего:.*/) || [''])[0] }));
});
