// Часть 6: рельеф по клеткам вместо горизонтальных полос, органические пятна,
// вьющиеся тропы, мягкие переходы и отдельное кэшированное поле боя. Декорации
// не меняют проходимость и не роняют FPS. Скриншоты — только во временную папку.
// Запуск: node scripts/cdp-mm6-terrain-render.mjs
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCdp } from './cdp-lib.mjs';

runCdp('TERRAIN RENDER PART 6', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0])`);
  await api.waitFor('!!window.__mm6State() && window.__mm6State().world.count>0', 8000);
  await api.sleep(900);

  const first = await api.ev('window.__mm6Debug.terrainRenderReport()');
  const signature = first.passabilitySignature;
  api.check('фон карты — кэшированное рельефное полотно, а не градиент',
    first.field.cached === true && first.field.patches >= 30 && first.field.soft >= 30 &&
    first.field.stones > 0 && first.field.bushes > 0 &&
    first.performance.mapFrame.avg < 16 && first.performance.mapFrame.frames > 20,
    JSON.stringify({field:first.field,perf:first.performance.mapFrame}));
  api.check('пятна органические, тропы вьются, у горизонта мягкий переход',
    first.field.organic > 0 && first.field.trails > 0 && first.field.transitions > 0 &&
    first.performance.battle.frames >= 0,
    JSON.stringify({organic:first.field.organic,trails:first.field.trails,
      transitions:first.field.transitions}));
  api.check('ближние клетки получают пятна травы и мягкие переходы',
    first.frame.cells >= 2 && first.frame.patches >= 4 && first.frame.soft >= 4 &&
    first.horizontalBands === false && first.mosaic === true,
    JSON.stringify({frame:first.frame,bands:first.horizontalBands,mosaic:first.mosaic}));
  const src = await api.ev(`fetch('index.html').then(r=>r.text())`);
  api.check('горизонтальные ленты удалены из отрисовки карты мира',
    /function buildBigMapMosaic/.test(src) && !/let used=0/.test(src) &&
    !/tile_building_/.test(src),
    JSON.stringify({mosaic:/function buildBigMapMosaic/.test(src),bands:/let used=0/.test(src)}));

  const worldShot = join(tmpdir(), 'mm6-part7-world.png');
  await api.screenshot(worldShot);
  api.check('скриншот игрового рельефа сохранён во временную папку',
    statSync(worldShot).size > 2000, String(statSync(worldShot).size));

  await api.ev('window.__mm6Debug.toggleBigMap(true)');
  await api.sleep(250);
  const opened = await api.ev('window.__mm6Debug.terrainRenderReport()');
  const world = await api.ev('window.__mm6Debug.worldMapReport()');
  const expectedCells = opened.world.reduce((n,m) => n + m.size*m.size, 0);
  api.check('мозаика большой карты построена по всем клеткам всех карт',
    opened.bigMap.maps === world.count && opened.bigMap.cells === expectedCells &&
    opened.bigMap.roads > 0 && opened.bigMap.trails > 0 && opened.bigMap.stones > 0 &&
    opened.bigMap.bushes > 0 && opened.bigMap.water > 0 && opened.bigMap.swamp > 0 &&
    opened.bigMap.patches > 0 && opened.bigMap.soft > 0,
    JSON.stringify({maps:opened.bigMap.maps,expected:world.count,cells:opened.bigMap.cells,
      expectedCells,details:opened.bigMap}));
  api.check('тропы большой карты изогнуты, пятна не однотипны',
    opened.bigMap.winding > 0 && opened.bigMap.organic > 0 &&
    opened.bigMap.trails > 0 && opened.bigMap.soft > 0,
    JSON.stringify({winding:opened.bigMap.winding,organic:opened.bigMap.organic,
      trails:opened.bigMap.trails,soft:opened.bigMap.soft}));

  const pixels = await api.ev(`(()=>{
    const cv=document.getElementById('bigMapCanvas'), g=cv.getContext('2d');
    const geo=window.__mm6Debug.worldMapReport().geometry;
    const pad=Math.max(2,geo.cell*.06);
    const x=Math.round(geo.ox+(geo.cols>1?geo.cell:0)+pad+2), y=Math.round(geo.oy+pad+2);
    const w=Math.max(20,Math.round(geo.cell-pad*2-4)), h=Math.max(20,Math.round(geo.cell-pad*2-4));
    const d=g.getImageData(x,y,w,h).data, rows=[];
    for(let yy=8;yy<h-8;yy+=6){
      const set=new Set();
      for(let xx=4;xx<w-4;xx+=5){ const i=(yy*w+xx)*4; set.add(d[i]+','+d[i+1]+','+d[i+2]); }
      rows.push(set.size);
    }
    return {rows:rows.length,avg:rows.reduce((a,b)=>a+b,0)/Math.max(1,rows.length),
      min:Math.min(...rows),max:Math.max(...rows),varied:rows.filter(n=>n>2).length};
  })()`);
  api.check('пиксели локации меняются по обеим осям — полос нет',
    pixels.rows >= 8 && pixels.avg > 3 && pixels.varied >= Math.floor(pixels.rows/2),
    JSON.stringify(pixels));

  const bigShot = join(tmpdir(), 'mm6-part7-worldmap.png');
  await api.screenshot(bigShot);
  api.check('скриншот карты мира сохранён во временную папку',
    statSync(bigShot).size > 2000, String(statSync(bigShot).size));

  await api.ev('window.__mm6Debug.toggleBigMap(false); window.__mm6Debug.toggleBigMap(true)');
  await api.sleep(180);
  const cached = await api.ev('window.__mm6Debug.terrainRenderReport()');
  api.check('повторное открытие карты использует кэш и не роняет FPS',
    cached.bigMap.cached === world.count && cached.cache.mosaic >= world.count &&
    cached.performance.bigMap.last < 20 && cached.performance.mapFrame.avg < 16,
    JSON.stringify({cached:cached.bigMap.cached,cache:cached.cache,perf:cached.performance}));
  api.check('декорации не изменили проходимость клеток',
    cached.passabilitySignature === signature, JSON.stringify({before:signature.length,after:cached.passabilitySignature.length}));

  await api.ev(`window.__mm6Debug.setSeason('winter')`);
  await api.sleep(180);
  const winter = await api.ev('window.__mm6Debug.terrainRenderReport()');
  const winterShot = join(tmpdir(), 'mm6-part7-winter.png');
  await api.screenshot(winterShot);
  api.check('сезонная мозаика перестраивается из тех же клеток',
    winter.cache.mosaic >= world.count && statSync(winterShot).size > 2000,
    JSON.stringify({cache:winter.cache,bytes:statSync(winterShot).size}));
  await api.ev(`window.__mm6Debug.setSeason('summer')`);
  await api.sleep(180);
  const restored = await api.ev('window.__mm6Debug.terrainRenderReport()');
  api.check('после возврата лета проходимость и мозаика совпадают с исходными',
    restored.passabilitySignature === signature && restored.cache.mosaic >= world.count,
    JSON.stringify({same:restored.passabilitySignature===signature,cache:restored.cache}));

  await api.ev(`(()=>{const d=window.__mm6Debug; d.toggleBigMap(false);
    d.startBattle(['Черт','Скелет','Зелёный Паук'].map(name=>({name,alive:true,hp:1000,maxHp:1000,
      atk:1,defVal:1,speed:1,def:{},gold:[0,0]}))); return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(260);
  const battle = await api.ev('window.__mm6Debug.terrainRenderReport()');
  api.check('поле боя — кэшированные органические пятна, вьющаяся тропа и мягкий горизонт',
    battle.battle.cached === true && battle.battle.patches >= 20 && battle.battle.organic > 0 &&
    battle.battle.trails > 0 && battle.battle.transitions > 0 &&
    (battle.battle.stones > 0 || battle.battle.bushes > 0) &&
    battle.cache.battle > 0 && battle.performance.battle.last < 16 &&
    battle.performance.mapFrame.avg < 16,
    JSON.stringify({battle:battle.battle,cache:battle.cache,
      perf:battle.performance.battle,mapFrame:battle.performance.mapFrame.avg}));
  const battleShot = join(tmpdir(), 'mm6-part6-battle.png');
  await api.screenshot(battleShot);
  api.check('скриншот поля боя сохранён во временную папку',
    statSync(battleShot).size > 2000, String(statSync(battleShot).size));
  await api.ev(`window.__mm6Debug.closeBattle()`);
  await api.sleep(80);
  const afterBattle = await api.ev('window.__mm6Debug.terrainRenderReport()');
  api.check('поле боя не изменило проходимость мира',
    afterBattle.passabilitySignature === signature,
    JSON.stringify({same:afterBattle.passabilitySignature===signature}));
});
