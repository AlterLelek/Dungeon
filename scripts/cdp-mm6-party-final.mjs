// Часть 8: сквозная CDP-проверка восьмичастной «ПАРТИИ».
// Один проход по всем этапам: иконки, HUD, непересечение окон, NPC, портреты,
// фасады поселений, рельеф и свежая документация. Запуск:
// node scripts/cdp-mm6-party-final.mjs
import { existsSync, readFileSync } from 'node:fs';
import { runCdp } from './cdp-lib.mjs';

const PARTS = Object.freeze({
  1: 'cdp-mm6-items-icons.mjs',
  2: 'cdp-mm6-battle-hud-v2.mjs',
  3: 'cdp-mm6-no-overlap.mjs',
  4: 'cdp-mm6-npc-dialogue.mjs',
  5: 'cdp-mm6-portraits-p3.mjs',
  6: 'cdp-mm6-buildings-render.mjs',
  7: 'cdp-mm6-terrain-render.mjs',
  8: 'cdp-mm6-party-final.mjs'
});

runCdp('PARTY FINAL PART 8', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0,1,2])`);
  await api.waitFor('!!window.__mm6State() && window.__mm6State().world.count>0', 8000);
  await api.sleep(700);

  // Часть 1: каталог, слои и порядок base → quality.
  const items = await api.ev(`(()=>{const d=window.__mm6Debug, all=d.allItemLayers();
    const bad=all.filter(e=>{const r=e.layers.map(l=>l.role), b=r.indexOf('base');
      return b!==r.filter(x=>x==='backdrop').length || r[r.length-1]!=='quality' ||
        r.filter(x=>x==='base').length!==1 || r.filter(x=>x==='quality').length!==1;});
    return {report:d.itemsReport(),total:all.length,bad:bad.map(e=>e.id)};})()`);
  api.check('Часть 1 — 202 предмета, элементная подложка, база и маска качества',
    items.report.count === 202 && items.report.ok && items.total === 202 &&
    items.report.qualityPaths.length === 4 && items.bad.length === 0,
    JSON.stringify({ count: items.report.count, ok: items.report.ok,
      quality: items.report.qualityPaths.length, bad: items.bad.slice(0, 5) }));

  // Часть 2: компактное окно состояния, HUD, карточки и очередь.
  const state = await api.ev('window.__mm6Debug.mapStateWindowReport()');
  api.check('Часть 2 — окно состояния 214×56 вместо большого окна героя',
    !!state && state.panel.w === 214 && state.panel.h === 56 && !!state.place && !!state.objective,
    JSON.stringify(state && state.panel));
  await api.ev(`(()=>{const list=['Черт','Скелет','Зелёный Паук'].map(name=>({name,alive:true,
    hp:1000,maxHp:1000,atk:1,defVal:1,speed:1,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(180);
  const hud = await api.ev('window.__mm6Debug.battleHudReport()');
  const queue = await api.ev('window.__mm6Debug.turnQueueReport()');
  api.check('Часть 2 — панель врага 235×62, карточки 64–76 px, очередь не шире 96 px',
    hud.panel.w >= 231 && hud.panel.w <= 239 && hud.panel.h >= 60 && hud.panel.h <= 64 &&
    hud.party.length === 3 && hud.party.every(c => c.h >= 64 && c.h <= 76) &&
    queue.visible && queue.rows.length <= 5 && queue.limit === 5 &&
    await api.ev(`document.getElementById('turnQueue').getBoundingClientRect().width`) <= 96,
    JSON.stringify({ panel: hud.panel, cards: hud.party.map(c => c.h), rows: queue.rows.length }));

  // Часть 3: правило непересечения в бою и на карте.
  await api.ev(`window.__mm6Debug.showToast('Сквозная проверка ПАРТИИ')`);
  await api.sleep(340);
  const battleOverlap = await api.ev('window.__mm6Debug.overlapReport()');
  api.check('Часть 3 — в бою ни одно окно, плашка и сообщение не перекрывают другое',
    battleOverlap.overlaps.length === 0 &&
    ['enemyPanel', 'turnBadge', 'logWindow', 'turnQueue', 'party', 'toast']
      .every(n => battleOverlap.rects.some(r => r.name === n)),
    JSON.stringify({ rects: battleOverlap.rects.map(r => r.name), overlaps: battleOverlap.overlaps }));
  await api.ev('window.__mm6Debug.closeBattle()');
  await api.sleep(120);
  await api.ev(`(()=>{const g=window.__mm6State(),m=g.world.maps[g.world.current],p=g.player;
    m.monsters.slice(0,3).forEach(e=>{e.x=p.x+1;e.y=p.y;e.alive=true;});
    window.__mm6Debug.showMapHint('Дорога','Дорога ведёт к ратуше');return true;})()`);
  await api.sleep(180);
  const mapOverlap = await api.ev('window.__mm6Debug.overlapReport()');
  api.check('Часть 3 — на карте подсказка, предупреждение и сообщение не пересекаются',
    mapOverlap.overlaps.length === 0 &&
    ['stateWindow', 'messageStrip', 'hint', 'enemyWarning', 'toast']
      .every(n => mapOverlap.rects.some(r => r.name === n)),
    JSON.stringify({ rects: mapOverlap.rects.map(r => r.name), overlaps: mapOverlap.overlaps }));

  // Часть 4: NPC с частями тела, жестами и крупным портретом внутри лавки.
  await api.ev(`window.__mm6Debug.forceShop('tavern');
    window.__mm6Debug.npcSay('Слух: в лесу видели старую башню','Хозяин таверны','tavern')`);
  await api.sleep(120);
  const npc = await api.ev('window.__mm6Debug.npcStageReport()');
  const gestures = await api.ev(`(()=>{const d=window.__mm6Debug;
    return ['tavern','magic','forge','church','hall'].map(k=>[k,d.npcGestureFor(k)]);})()`);
  api.check('Часть 4 — диалог внутри лавки, портреты, анимированный спрайт и жесты по типу',
    !!npc && npc.visible && npc.inShop && /старую башню/.test(npc.text) &&
    /\/portraits\//.test(npc.heroFaceSrc || '') && /\/portraits\//.test(npc.npcPortraitSrc || '') &&
    npc.groups.length === 5 && npc.gesturesEnabled &&
    npc.animationNames.some(n => n && n !== 'none') &&
    gestures.every(([k, g]) => !!g) && new Set(gestures.map(([, g]) => g)).size >= 3,
    JSON.stringify({ visible: npc && npc.visible, inShop: npc && npc.inShop,
      groups: npc && npc.groups, animation: npc && npc.animationNames, gestures }));
  const dialogueOverlap = await api.ev('window.__mm6Debug.overlapReport()');
  api.check('Часть 3 — диалог NPC не перекрывает окно лавки',
    dialogueOverlap.overlaps.length === 0,
    JSON.stringify(dialogueOverlap.overlaps));
  await api.ev(`window.__mm6Debug.closeNpcDialogue(); window.__mm6Debug.toggleShop(false)`);

  // Часть 5: 40 файлов десяти классов, лицо отцентрировано в овале.
  const portraits = await api.ev(`(async()=>{
    const list=(await fetch('${api.base}/assets/manifest.json').then(r=>r.json()))
      .filter(e=>e.type==='portrait');
    const classes={}; const bad=[];
    for(const e of list){
      const stem=e.file.replace(/\\.svg$/,'');
      const [cls,v]=stem.split('_');
      classes[cls]=(classes[cls]||0)+1;
      const text=await fetch('${api.base}/'+e.path).then(r=>r.text());
      const doc=new DOMParser().parseFromString(text,'image/svg+xml');
      const oval=doc.querySelector('#faceOval');
      const cx=oval?+oval.getAttribute('cx'):0, cy=oval?+oval.getAttribute('cy'):0;
      if(!/viewBox="0 0 512 512"/.test(text) || !oval ||
         Math.abs(cx-256)>2 || Math.abs(cy-256)>12 ||
         /linearGradient|radialGradient|<filter|<image/i.test(text)) bad.push(stem);
    }
    return {total:list.length,classes,bad};})()`);
  const portraitClasses = ['warrior','mage','paladin','angel','archer','druid','rogue','amazon','dwarf','dwarfmage'];
  api.check('Часть 5 — 10 классов × 4 портрета с центром лица в овале',
    portraits.total === 40 && portraits.bad.length === 0 &&
    portraitClasses.every(c => portraits.classes[c] === 4) &&
    Object.keys(portraits.classes).length === 10,
    JSON.stringify({ total: portraits.total, classes: portraits.classes, bad: portraits.bad }));

  // Часть 6: фасады выбираются из манифеста по данным поселений.
  const buildings = await api.ev('window.__mm6Debug.buildingReport()');
  api.check('Часть 6 — 16 SVG-фасадов из манифеста размещены во всех поселениях',
    buildings.manifest.length === 16 &&
    buildings.manifest.every(e => /^\.\.\/\.\.\/shared\/assets\/master\/buildings\/[a-z0-9_]+\.svg$/.test(e.path)) &&
    buildings.cells.length > 0 &&
    buildings.manifest.every(e => buildings.cells.some(c => c.placed.includes(e.id))),
    JSON.stringify({ manifest: buildings.manifest.length, maps: buildings.cells.length,
      missing: buildings.manifest.filter(e => !buildings.cells.some(c => c.placed.includes(e.id))).map(e => e.id) }));

  // Часть 7: рельеф по клеткам, кэш и неизменная проходимость.
  const terrainBefore = await api.ev('window.__mm6Debug.terrainRenderReport()');
  await api.ev('window.__mm6Debug.toggleBigMap(true)');
  await api.sleep(240);
  const terrainOpen = await api.ev('window.__mm6Debug.terrainRenderReport()');
  const world = await api.ev('window.__mm6Debug.worldMapReport()');
  const cells = terrainOpen.world.reduce((n,m) => n + m.size*m.size, 0);
  api.check('Часть 7 — мозаика по всем клеткам, пятна и тропы, проходимость не изменена',
    terrainBefore.field.cached === true && terrainBefore.horizontalBands === false &&
    terrainBefore.performance.mapFrame.avg < 16 &&
    terrainOpen.bigMap.maps === world.count && terrainOpen.bigMap.cells === cells &&
    terrainOpen.bigMap.patches > 0 && terrainOpen.bigMap.trails > 0 &&
    terrainOpen.bigMap.stones > 0 && terrainOpen.bigMap.bushes > 0 &&
    terrainOpen.passabilitySignature === terrainBefore.passabilitySignature,
    JSON.stringify({ cached: terrainBefore.field.cached, frameAvg: terrainBefore.performance.mapFrame.avg,
      maps: terrainOpen.bigMap.maps, cells: terrainOpen.bigMap.cells, expected: cells }));
  await api.ev('window.__mm6Debug.toggleBigMap(false)');

  // Часть 8: харнесы всех частей, документы и передача ассетов на месте.
  const missing = Object.values(PARTS).map(f => 'scripts/' + f)
    .filter(f => !existsSync(f) || readFileSync(f, 'utf8').length < 80);
  const design = readFileSync('docs/DESIGN.md', 'utf8');
  const handoff = readFileSync('docs/ASSET_HANDOFF.md', 'utf8');
  const frozen = [
    'НИ ОДНО окно, плашка, сообщение или подсказка не перекрывают другое окно',
    '214×56', '235×62', '10 классов × 4 портрета', 'серые заглушки', 'рельеф рисуется по данным клеток'
  ];
  api.check('Часть 8 — все харнесы ПАРТИИ, замороженные решения и свежая передача ассетов',
    missing.length === 0 && frozen.every(s => design.includes(s)) &&
    /cdp-mm6-party-final\.mjs/.test(design) &&
    /Всего: \*\*1066 SVG\*\* и \*\*275 PNG\*\*/.test(handoff),
    JSON.stringify({ missing, design: frozen.filter(s => !design.includes(s)),
      handoff: (handoff.match(/Всего:.*/) || [''])[0] }));
});
