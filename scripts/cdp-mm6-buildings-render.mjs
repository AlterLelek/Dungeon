// Часть 6: данные поселения → выбор SVG → отрисовка на карте.
// Скриншоты всех зданий всех поселений идут только во временную папку.
// Запуск: node scripts/cdp-mm6-buildings-render.mjs
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCdp } from './cdp-lib.mjs';

runCdp('BUILDINGS RENDER PART 6', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0])`);
  await api.waitFor('!!window.__mm6State() && window.__mm6State().world.count>0', 8000);
  await api.sleep(400); // ждём предзагрузку фасадов из манифеста

  const report = await api.ev('window.__mm6Debug.buildingReport()');
  const expected = new Map(report.manifest.map(e => [e.id, e.path]));
  api.check('в манифесте 16 фасадов, все путиshared-ассетов без PNG',
    report.manifest.length === 16 &&
    report.manifest.every(e => /^\.\.\/\.\.\/shared\/assets\/master\/buildings\/[a-z0-9_]+\.svg$/.test(e.path)),
    JSON.stringify(report.manifest.map(e => e.path)));

  const loaded = await api.ev(`(async()=>{
    const rows=window.__mm6Debug.buildingReport().manifest;
    return Promise.all(rows.map(async e=>{
      const url=new URL(e.path,location.href).href;
      const res=await fetch(url), text=await res.text();
      return {id:e.id,status:res.status,type:res.headers.get('content-type')||'',
        svg:/<svg[\\s>]/.test(text),bad:/\\.png|linearGradient|radialGradient|<filter/i.test(text)};
    }));
  })()`);
  api.check('каждый путь из манифеста отдаёт валидный SVG без 404',
    loaded.length === 16 && loaded.every(a => a.status === 200 && a.svg && !a.bad && /svg/.test(a.type)),
    JSON.stringify(loaded.filter(a => a.status !== 200 || !a.svg || a.bad)));

  const cells = report.cells;
  api.check('все типы зданий из каталога присутствуют в поселениях мира',
    cells.length > 0 && report.manifest.every(e => cells.some(c => c.placed.includes(e.id))),
    JSON.stringify({ manifest: [...expected.keys()],
      placed: [...new Set(cells.flatMap(c => c.placed))].sort() }));

  const rows = [];
  for (const map of cells) {
    const ids = [...new Set([
      ...map.buildings.map(b => String(b.buildingId)),
      ...map.placed,
    ])];
    for (const id of ids) {
      const focus = await api.ev(`window.__mm6Debug.focusBuilding(${map.map}, ${JSON.stringify(id)})`);
      await api.sleep(110);
      const drawn = await api.ev(`window.__mm6Debug.buildingReport().drawn
        .filter(x=>x.buildingId===${JSON.stringify(id)})`);
      const shot = join(tmpdir(), `mm6-part6-map${map.map}-${id}.png`);
      await api.screenshot(shot);
      rows.push({ map: map.map, settlement: map.settlement, id, focus,
        drawn, shot, size: statSync(shot).size,
        pathOk: !!focus && focus.path === expected.get(id),
        svgOk: drawn.length > 0 && drawn.some(x => x.path === expected.get(id) &&
          x.loaded && x.drawn && x.naturalWidth > 0 && !/\.png/i.test(x.path)),
        cover: !!(focus && focus.viewX >= 0 && focus.viewY >= 0) });
    }
    const bad = rows.filter(r => r.map === map.map && (!r.pathOk || !r.svgOk || !r.cover || r.size < 2000));
    api.check(`поселение «${map.settlement}»: все ${ids.length} фасадов из данных нарисованы и сфотографированы`,
      bad.length === 0, JSON.stringify(bad.map(r => ({ id: r.id, focus: r.focus, drawn: r.drawn, size: r.size }))));
  }

  const covered = new Set(rows.filter(r => r.svgOk).map(r => r.id));
  api.check('скриншоты покрывают все 16 типов зданий во всех поселениях',
    covered.size === 16 && [...expected.keys()].every(id => covered.has(id)),
    JSON.stringify({ covered: [...covered].sort(), total: rows.length,
      shots: rows.length, folder: tmpdir(), bytes: rows.reduce((n, r) => n + r.size, 0) }));

  api.check('серые заглушки и Kenney-PNG больше не используются для зданий',
    rows.every(r => r.drawn.every(x => !/\.png/i.test(x.path || ''))) &&
    await api.ev(`(async()=>{
      const text=await fetch('index.html').then(r=>r.text());
      return !/tile_building_/.test(text);
    })()`));
});
