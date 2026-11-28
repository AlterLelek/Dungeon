// Часть 4 [ГОБОРЕНО]: 16 фасадов с крупной читаемой вывеской, значок слева от
// строки типа, имя под типом; отдельный бандитский люк у колодца без скрытого входа.
// Запуск: node scripts/cdp-mm6-signs-layout-part4.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('SIGNS LAYOUT PART 4', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0])`);
  await api.waitFor('!!window.__mm6State() && window.__mm6State().world.count>0', 8000);
  await api.sleep(400);

  const report = await api.ev('window.__mm6Debug.buildingReport()');
  const facades = await api.ev(`(async()=>{
    const rows=window.__mm6Debug.buildingReport().manifest;
    const host=document.createElement('div');
    host.style.cssText='position:absolute;left:-10000px;top:0;width:512px;height:512px';
    document.body.appendChild(host);
    const out=[];
    for(const e of rows){
      const res=await fetch(new URL(e.path,location.href).href);
      const text=await res.text();
      const parsed=new DOMParser().parseFromString(text,'image/svg+xml');
      const svg=document.importNode(parsed.documentElement,true);
      svg.setAttribute('width','512'); svg.setAttribute('height','512');
      host.replaceChildren(svg);
      await document.fonts.ready;
      const glyph=svg.querySelector('[data-sign]');
      const type=svg.querySelector('[data-line="type"]');
      const shop=svg.querySelector('[data-line="shop"]');
      const box=el=>{const r=el.getBoundingClientRect();return {x:+r.left.toFixed(1),
        y:+r.top.toFixed(1),w:+r.width.toFixed(1),right:+r.right.toFixed(1),
        bottom:+r.bottom.toFixed(1)};};
      const board=svg.querySelector('#signBoard');
      const texts=[...svg.querySelectorAll('#sign text')];
      out.push({id:e.id,sign_text:e.sign_text,status:res.status,
        svg:/<svg[\\s>]/.test(text),png:/\\.png|linearGradient|radialGradient|<filter/i.test(text),
        font40:texts.length===2&&texts.every(t=>t.getAttribute('font-size')==='40'),
        glyphFirst:!!glyph&&!!type&&text.indexOf('data-sign=')<text.indexOf('data-line="type"'),
        glyphLeft:!!glyph&&!!type&&box(glyph).right<=box(type).x+1,
        boxes:!!glyph&&!!type?{g:box(glyph),t:box(type)}:null,
        order:!!type&&!!shop&&type.textContent.trim()+' «'+shop.textContent.trim()+'»'===e.sign_text,
        hatch:/data-part="den-hatch"/.test(text)&&/data-lair="bandit"/.test(text)&&
          !/data-part="hidden-entrance"/.test(text),board:!!board});
    }
    host.remove();
    return out;
  })()`);
  const well = facades.find(f => f.id === 'well_0');
  api.check('все 16 фасадов — валидные SVG, без PNG, градиентов и фильтров',
    facades.length === 16 && facades.every(f => f.status === 200 && f.svg && !f.png && f.board),
    JSON.stringify(facades.filter(f => f.status !== 200 || !f.svg || f.png || !f.board)));
  api.check('шрифт 40, значок слева, тип сверху и имя снизу по данным батча',
    facades.every(f => f.font40 && f.glyphFirst && f.glyphLeft && f.order),
    JSON.stringify(facades.filter(f => !(f.font40 && f.glyphFirst && f.glyphLeft && f.order))
      .map(f => ({ id: f.id, font40: f.font40, glyphFirst: f.glyphFirst,
        glyphLeft: f.glyphLeft, boxes: f.boxes, order: f.order, text: f.sign_text }))));
  api.check('у колодца отдельный бандитский люк, скрытого входа нет',
    !!well && well.hatch && facades.filter(f => f.hatch).length === 1,
    JSON.stringify({ well: !!well, hatches: facades.filter(f => f.hatch).map(f => f.id) }));

  const drawn = report.drawn.filter(d => d.drawn);
  api.check('вывески реально рисуются на карте из SVG-манифеста, а не заглушками',
    drawn.length > 0 && drawn.every(d => /\.svg$/.test(d.path || '') && d.loaded && d.naturalWidth > 0) &&
    report.manifest.length === 16,
    JSON.stringify({ drawn: drawn.length, bad: drawn.filter(d =>
      !/\.svg$/.test(d.path || '') || !d.loaded || !d.naturalWidth).slice(0, 5) }));
});
