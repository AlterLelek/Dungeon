// CDP-проверка ЧАСТИ 4: двор вокруг ратуши, дороги до края карты с обходом
// препятствий, доступность бонусов и объектов, скриншоты во временную папку.
// Запуск: node scripts/cdp-mm6-world-p4.mjs
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCdp } from './cdp-lib.mjs';

await runCdp('WORLD PART 4', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0])`);
  await api.waitFor(`!!window.__mm6State() && window.__mm6State().world.count>0`, 8000);

  const report = await api.ev(`window.__mm6Debug.accessReport()`);
  const rows = report.rows;
  api.check('отчёт доступности мира без ошибок', report.ok && rows.length > 0,
    JSON.stringify(report.errors));
  api.check('дороги доходят до края каждой карты',
    rows.length > 0 && rows.every(r => r.edgeRoads > 0),
    JSON.stringify(rows.map(r => ({ map: r.map, edgeRoads: r.edgeRoads, gates: r.gateRoads }))));
  api.check('к каждому выходу на карте подходит дорога',
    rows.every(r => r.gateRoads.length > 0 && r.gateRoads.every(g => g.roads > 0)),
    JSON.stringify(rows.map(r => ({ map: r.map, gates: r.gateRoads.length,
      bare: r.gateRoads.filter(g => !g.roads).length }))));
  api.check('дороги не проложены поверх гор, деревьев и зданий',
    rows.every(r => r.obstaclesOnRoad === 0),
    JSON.stringify(rows.map(r => ({ map: r.map, obstacles: r.obstaclesOnRoad }))));
  api.check('все бонусы и объекты доступны из входа',
    rows.every(r => r.objects > 0 && r.unreachable === 0),
    JSON.stringify(rows.map(r => ({ map: r.map, objects: r.objects, unreachable: r.unreachable,
      details: r.details }))));
  api.check('официальные здания стоят компактным двором вокруг ратуши',
    rows.every(r => r.clusterSpread <= 4 && r.buildings >= 4 && r.connected === r.buildings),
    JSON.stringify(rows.map(r => ({ map: r.map, spread: r.clusterSpread,
      buildings: r.buildings, connected: r.connected, missing: r.unreachableBuildings }))));

  const full = await api.ev(`(async()=>{
    const data=await import('./data.js');
    const w=window.__mm6State().world;
    return w.maps.map(m=>{
      const expected=data.settlementOf(m.index).shops.length;
      const built=m.settlement.buildings;
      const nearRoad=built.filter(b=>{
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
          const x=b.x+dx,y=b.y+dy,c=m.cells[y]&&m.cells[y][x];
          if(c&&(c.t==='road'||c.t==='bridge')) return true;
        }
        return false;
      }).length;
      const hall=m.settlement.hall;
      const radius=built.length?Math.max(...built.map(b=>Math.max(Math.abs(b.x-hall.x),Math.abs(b.y-hall.y)))):99;
      return {map:m.index,expected,built:built.length,hall,nearRoad,radius};
    });
  })()`);
  api.check('ни одно официальное здание из SETTLEMENTS не пропущено',
    full.every(r => r.built === r.expected),
    JSON.stringify(full.map(r => ({ map: r.map, expected: r.expected, built: r.built }))));
  api.check('все здания двора соединены дорогами и находятся рядом с ратушой',
    full.every(r => r.nearRoad === r.built && r.radius <= 4),
    JSON.stringify(full.map(r => ({ map: r.map, nearRoad: r.nearRoad,
      built: r.built, radius: r.radius }))));

  // Скриншоты сохраняются только во временную папку: в репозиторий PNG не попадают.
  const cityShot = join(tmpdir(), 'mm6-part4-city.png');
  const worldShot = join(tmpdir(), 'mm6-part4-world.png');
  await api.ev(`(()=>{const m=window.__mm6State().world.maps[0];
    window.__mm6Debug.setHeroPos&&window.__mm6Debug.setHeroPos(m.settlement.hall.x,m.settlement.hall.y);
    return true;})()`);
  await api.screenshot(cityShot);
  await api.ev(`window.__mm6Debug.toggleBigMap(true)`);
  await api.sleep(250);
  await api.screenshot(worldShot);
  await api.ev(`window.__mm6Debug.toggleBigMap(false)`);
  const sizes = [cityShot, worldShot].map(f => statSync(f).size);
  api.check('скриншоты двора и карты мира сохранены во временную папку',
    sizes.every(n => n > 2000), JSON.stringify({ city: cityShot, world: worldShot, sizes }));
});
