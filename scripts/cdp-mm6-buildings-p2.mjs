// CDP-проверка ЧАСТИ 2: знаки по shop_kind, названия на вывесках, притон в колодце.
// Запуск: node scripts/cdp-mm6-buildings-p2.mjs
import { runCdp } from './cdp-lib.mjs';

await runCdp('BUILDINGS PART 2', async api => {
  await api.ev(`location.href='${api.base}/index.html'`);
  await api.waitFor(`document.readyState==='complete'`, 8000);

  const report = await api.ev(`(async()=>{
    const batch=await fetch('assets/buildings-batch.json').then(r=>r.json());
    const data=await import('./games/mm6/data.js');
    const byKind={forge:'anvil',weapons:'sword',armory:'sword',armor:'sword',magic:'potion_star',
      tavern:'mug',inn:'bed',market:'coin_sack',jeweler:'gem',church:'gem',hall:'house'};
    const byId={house_straw_0:'house',house_tile_0:'house',stone_house_0:'house',barn_0:'sheaf',
      shed_0:'rake',stable_0:'horseshoe',well_0:'bucket'};
    const expected=e=>{
      for(const k of (e.shop_kind||[])) if(byKind[k]) return byKind[k];
      const stem=e.path.split('/').pop().replace(/\\.svg$/,'');
      return byId[stem]||null;
    };
    const rows=[];
    for(const e of batch){
      const stem=e.path.split('/').pop().replace(/\\.svg$/,'');
      const text=await fetch(e.path).then(r=>r.text());
      const doc=new DOMParser().parseFromString(text,'image/svg+xml');
      const sign=doc.querySelector('#sign');
      const glyph=doc.querySelector('#sign [data-sign]');
      const lines=[...doc.querySelectorAll('#sign text')].map(t=>t.textContent);
      const drum=doc.querySelector('#door[data-part="winch"] ellipse');
      const type=data.BUILDING_TYPES.find(b=>b.id===stem);
      rows.push({
        stem, shop_kind:e.shop_kind, batchIcon:e.sign_icon, expected:expected(e),
        svgIcon:glyph&&glyph.getAttribute('data-sign'), svgName:sign&&sign.getAttribute('data-sign-name'),
        signType:sign&&sign.getAttribute('data-sign-type'), signShop:sign&&sign.getAttribute('data-sign-shop'),
        signLines:lines, batchName:e.sign_text,
        dataName:type&&type.signName,
        well:stem==='well_0'?(()=>{
          const hatch=doc.querySelector('[data-part="den-hatch"]');
          return {
            winch:!!drum, winchRadius:drum?+(drum.getAttribute('rx')||0):0,
            bucket:!!doc.querySelector('[data-part="bucket"] path'),
            hatch:!!hatch, lair:hatch&&hatch.getAttribute('data-lair'),
            hatchOpening:!!(hatch&&hatch.querySelector('[data-hatch-opening]')),
            hatchCanopy:!!(hatch&&hatch.querySelector('[data-hatch-canopy]')),
            hatchSteps:!!(hatch&&hatch.querySelector('[data-hatch-steps]')),
            hatchLid:!!(hatch&&hatch.querySelector('[data-hatch-lid]')),
            hiddenEntrance:!!doc.querySelector('[data-part="hidden-entrance"]')
          };
        })():null
      });
    }
    return {rows,types:data.BUILDING_TYPES.map(b=>({id:b.id,signName:b.signName}))};
  })()`);

  const rows = report.rows;
  const well = rows.find(r => r.stem === 'well_0');
  api.check('все 16 зданий проверены', rows.length === 16, String(rows.length));
  api.check('знак вывески строго соответствует shop_kind/id во всех зданиях',
    rows.every(r => r.expected && r.batchIcon === r.expected && r.svgIcon === r.expected),
    JSON.stringify(rows.filter(r => r.batchIcon !== r.expected || r.svgIcon !== r.expected)
      .map(r => ({ stem: r.stem, shop_kind: r.shop_kind, batch: r.batchIcon, svg: r.svgIcon, expected: r.expected }))));
  api.check('ключевые знаки: наковальня/меч/зелье/кружка/сноп/ведро',
    ['forge_0', 'armory_0', 'magic_0', 'tavern_0', 'barn_0', 'well_0']
      .map(stem => rows.find(r => r.stem === stem))
      .every((r, i) => r && r.svgIcon === ['anvil', 'sword', 'potion_star', 'mug', 'sheaf', 'bucket'][i]),
    JSON.stringify(['forge_0', 'armory_0', 'magic_0', 'tavern_0', 'barn_0', 'well_0']
      .map(stem => { const r = rows.find(x => x.stem === stem); return r && [r.stem, r.svgIcon]; })));
  api.check('полное название вывески отрисовано во всех зданиях (тип + имя без обрезки)',
    rows.every(r => r.svgName === r.batchName && r.signLines.length === 2 &&
      r.signLines[0] === r.signType && r.signLines[1] === r.signShop &&
      r.signType + ' «' + r.signShop + '»' === r.batchName && !r.signShop.includes('…')),
    JSON.stringify(rows.filter(r => r.svgName !== r.batchName || r.signLines.length !== 2 ||
      r.signType + ' «' + r.signShop + '»' !== r.batchName)
      .map(r => ({ stem: r.stem, name: r.svgName, type: r.signType, shop: r.signShop,
        expected: r.batchName, lines: r.signLines }))));
  api.check('названия мастерских и лавок есть в данных MM6 и совпадают с вывесками',
    rows.filter(r => r.dataName).every(r => r.dataName === r.batchName) &&
    ['forge_0', 'shop_0', 'tavern_0', 'armory_0', 'jewelry_0', 'magic_0', 'inn_0']
      .every(stem => !!rows.find(r => r.stem === stem && r.dataName)),
    JSON.stringify(rows.filter(r => r.dataName && r.dataName !== r.batchName)
      .map(r => ({ stem: r.stem, data: r.dataName, sign: r.batchName }))));
  api.check('колодец — воровской притон: ворот, ведро и отдельный люк под навесом',
    !!well && well.well && well.well.winch && well.well.winchRadius >= 36 && well.well.bucket &&
    well.well.hatch && well.well.lair === 'bandit' && well.well.hatchOpening &&
    well.well.hatchCanopy && well.well.hatchSteps && well.well.hatchLid &&
    !well.well.hiddenEntrance,
    JSON.stringify(well && well.well));

  await api.startGame();
  const gameNames = await api.ev(`(()=>{const m=window.__mm6State().world.maps[0];
    return {shops:m.shops.map(s=>s.name),buildings:m.settlement.buildings.map(b=>b.name)};})()`);
  api.check('имена лавок в игре взяты с вывесок',
    ['Кузница «Гром и Наковальня»', 'Лавка «Мешок и Монета»', 'Таверна «Пенная Кружка»',
      'Оружейная «Острый Клинок»', 'Магазин магии «Звёздная Склянка»']
      .every(name => gameNames.shops.includes(name)) && gameNames.buildings.includes('Ратуша «у площади»'),
    JSON.stringify(gameNames));
});
