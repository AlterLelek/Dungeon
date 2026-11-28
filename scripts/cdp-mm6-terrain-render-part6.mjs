// Часть 6 [ГОБОРЕНО]: рельеф рисуется по клеткам, тропы вьются, поле боя
// кэшировано и не даёт просадок FPS во время реальных ходов; проходимость не меняется.
// Запуск: node scripts/cdp-mm6-terrain-render-part6.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('TERRAIN RENDER PART 6', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0])`);
  await api.waitFor('!!window.__mm6State() && window.__mm6State().world.count>0', 8000);
  await api.sleep(700);

  const before = await api.ev('window.__mm6Debug.terrainRenderReport()');
  const world = await api.ev('window.__mm6Debug.worldMapReport()');
  const cells = before.world.reduce((n, m) => n + m.size * m.size, 0);
  api.check('карта строится по всем клеткам, а не горизонтальными полосами',
    before.mosaic === true && before.horizontalBands === false &&
    before.frame.cells >= 2 && before.field.patches >= 30 && before.field.soft >= 30 &&
    cells > 0 && world.count === before.world.length,
    JSON.stringify({ frame: before.frame, field: before.field, cells, maps: before.world.length }));

  await api.ev('window.__mm6Debug.toggleBigMap(true)');
  await api.sleep(260);
  const opened = await api.ev('window.__mm6Debug.terrainRenderReport()');
  api.check('мозаика большой карты покрывает все клетки и содержит тропы',
    opened.bigMap.maps === world.count && opened.bigMap.cells === cells &&
    opened.bigMap.roads > 0 && opened.bigMap.trails > 0 && opened.bigMap.winding > 0 &&
    opened.bigMap.patches > 0 && opened.bigMap.soft > 0 &&
    opened.passabilitySignature === before.passabilitySignature,
    JSON.stringify({ bigMap: opened.bigMap, expected: cells }));

  // Разнообразие по двум осям: при горизонтальных лентах столбцы были бы одинаковыми.
  const pixels = await api.ev(`(()=>{
    const c=document.getElementById('bigMapCanvas'), g=c.getContext('2d');
    const geo=window.__mm6Debug.worldMapReport().geometry;
    const pad=Math.max(2,geo.cell*.06);
    const x0=Math.round(geo.ox+(geo.cols>1?geo.cell:0)+pad+2);
    const y0=Math.round(geo.oy+pad+2);
    const w=Math.max(20,Math.round(geo.cell-pad*2-4));
    const h=Math.max(20,Math.round(geo.cell-pad*2-4));
    const d=g.getImageData(x0,y0,w,h).data;
    const at=(x,y)=>{const i=(y*w+x)*4;return d[i]+','+d[i+1]+','+d[i+2];};
    const cols=[],rows=[];
    for(let x=4;x<w-4;x+=5){const s=new Set();
      for(let y=4;y<h-4;y+=3)s.add(at(x,y)); cols.push(s.size);}
    for(let y=4;y<h-4;y+=5){const s=new Set();
      for(let x=4;x<w-4;x+=3)s.add(at(x,y)); rows.push(s.size);}
    return {w,h,cols:cols.length,rows:rows.length,
      variedCols:cols.filter(n=>n>2).length,variedRows:rows.filter(n=>n>2).length,
      avgCol:cols.reduce((a,b)=>a+b,0)/cols.length,avgRow:rows.reduce((a,b)=>a+b,0)/rows.length};})()`);
  api.check('пиксели меняются по обеим осям — полос нет',
    pixels.cols >= 8 && pixels.rows >= 8 &&
    pixels.variedCols >= Math.floor(pixels.cols / 2) &&
    pixels.variedRows >= Math.floor(pixels.rows / 2) && pixels.avgCol > 3 && pixels.avgRow > 3,
    JSON.stringify(pixels));
  await api.ev(`window.__mm6Debug.toggleBigMap(false);true`);

  await api.ev(`(()=>{const list=['Черт','Скелет','Зелёный Паук'].map(name=>({name,alive:true,
    hp:1000,maxHp:1000,atk:1,defVal:1,speed:1,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(250);

  const field = await api.ev('window.__mm6Debug.terrainRenderReport()');
  api.check('поле боя кэшировано, с пятнами, камнями и вьющимися тропами',
    field.battle.cached === true && field.battle.patches > 0 && field.battle.organic > 0 &&
    field.battle.trails > 0 && field.battle.transitions > 0 && field.cache.battle > 0 &&
    field.performance.battle.last < 16,
    JSON.stringify({ battle: field.battle, cache: field.cache, last: field.performance.battle.last }));

  // Настоящие ходы: смотрим FPS после бота, а не только на пустом кадре.
  const timings = [];
  for (let i = 0; i < 4; i++) {
    await api.ev(`window.__mm6Debug.heroAttack(); true`);
    await api.sleep(180);
    timings.push(await api.ev(`window.__mm6Debug.terrainRenderReport().performance.battle.last`));
  }
  api.check('после четырёх атак кадр боя остаётся быстрым',
    timings.length === 4 && timings.every(t => Number.isFinite(t) && t < 16),
    JSON.stringify(timings));
  api.check('декорации боя не изменили проходимость мира',
    field.passabilitySignature === before.passabilitySignature,
    JSON.stringify({ same: field.passabilitySignature === before.passabilitySignature }));
  await api.ev(`window.__mm6Debug.closeBattle();true`);
});
