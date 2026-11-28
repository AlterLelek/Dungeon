// CDP-проверка ЧАСТИ 1: одноэтажные фасады, окна второго этажа, STYLE-контракт.
// Запуск: node scripts/cdp-mm6-buildings-p1.mjs
import { runCdp } from './cdp-lib.mjs';

await runCdp('BUILDINGS PART 1', async api => {
  await api.ev(`location.href='${api.base}/index.html'`);
  await api.waitFor(`document.readyState==='complete'`, 8000);

  const report = await api.ev(`(async()=>{
    const batch=await fetch('../../assets/buildings-batch.json').then(r=>r.json());
    const out=[];
    for(const entry of batch){
      const url=entry.path;
      const text=await fetch(url).then(r=>r.text());
      const doc=new DOMParser().parseFromString(text,'image/svg+xml');
      const parseError=doc.querySelector('parsererror');
      const img=new Image(); img.src=url; await img.decode();
      const windows=[...doc.querySelectorAll('#window > path')]
        .filter(p=>(p.getAttribute('fill')||'')==='#8f7a5f' && (p.getAttribute('stroke-width')||'')==='3');
      const upper=windows.filter(p=>{
        const m=(p.getAttribute('d')||'').match(/^M(\\d+) (\\d+) H(\\d+) V(\\d+)/);
        return m && +m[2] < 240;
      });
      out.push({
        stem:url.split('/').pop().replace('.svg',''),
        floors:entry.floors, title:doc.querySelector('title')?.textContent||'',
        groups:['base','chimney','roof','sign','door','window','decor']
          .filter(id=>!!doc.querySelector('#'+id)),
        windows:windows.length, upperWindows:upper.length,
        upperWidths:upper.map(p=>{
          const m=(p.getAttribute('d')||'').match(/^M(\\d+) (\\d+) H(\\d+)/);
          return m ? +m[3]-(+m[1]) : 0;
        }),
        img:{w:img.naturalWidth,h:img.naturalHeight,viewBox:doc.documentElement.getAttribute('viewBox')},
        badStyle:/linearGradient|radialGradient|drop-shadow|<filter|<image|\\.png|<rect[^>]*\\b(?:rx|ry)=/i.test(text),
        text:doc.querySelector('#sign text')?.textContent||'',
        parseError:!!parseError
      });
    }
    return out;
  })()`);

  const houses = report.filter(r => r.stem !== 'well_0');
  api.check('все 16 фасадов загружаются как валидные SVG',
    report.length === 16 && report.every(r => !r.parseError && r.img.w > 0 &&
      r.img.viewBox === '0 0 512 512'),
    JSON.stringify(report.slice(0, 3).map(r => ({ stem: r.stem, img: r.img, parseError: r.parseError }))));
  api.check('одноэтажные здания имеют 2 окна, двухэтажные — 4',
    houses.every(r => r.windows === (r.floors === 2 ? 4 : 2)) &&
    report.filter(r => r.floors === 2).map(r => r.stem).sort().join(',') === 'inn_0,tavern_0',
    JSON.stringify(houses.map(r => ({ stem: r.stem, floors: r.floors, windows: r.windows }))));
  api.check('второй этаж только у таверны и гостиницы, с окнами',
    houses.filter(r => r.floors === 2).every(r => r.upperWindows === 2) &&
    houses.filter(r => r.floors === 1).every(r => r.upperWindows === 0),
    JSON.stringify(houses.filter(r => r.floors === 2).map(r => ({ stem: r.stem, upper: r.upperWindows, widths: r.upperWidths }))));
  api.check('окна второго этажа таверны занимают ~3/4 ширины',
    (() => { const t = report.find(r => r.stem === 'tavern_0');
      return t && t.upperWidths.length === 2 && t.upperWidths.every(w => w >= 120); })(),
    JSON.stringify(report.find(r => r.stem === 'tavern_0')?.upperWidths));
  api.check('у зданий есть слои фундамента, стены, крыши, двери, окон и вывески',
    houses.every(r => r.groups.includes('base') && r.groups.includes('chimney') &&
      r.groups.includes('roof') && r.groups.includes('sign') &&
      r.groups.includes('door') && r.groups.includes('window')),
    JSON.stringify(houses.map(r => ({ stem: r.stem, groups: r.groups.length }))));
  api.check('STYLE-контракт: нет градиентов, фильтров, скруглений и PNG',
    report.every(r => !r.badStyle),
    JSON.stringify(report.filter(r => r.badStyle).map(r => r.stem)));
});
