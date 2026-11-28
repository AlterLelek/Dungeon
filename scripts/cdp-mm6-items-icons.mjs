// CDP-проверка иконок предметов: элементная подложка, качество на силуэте,
// все 202 предмета из каталога и отсутствие двойных обёрток в лавке/инвентаре.
// Запуск: node scripts/cdp-mm6-items-icons.mjs
import { statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCdp } from './cdp-lib.mjs';

runCdp('ITEMS ICONS', async api => {
  await api.startGame();

  const report = await api.ev('window.__mm6Debug.itemsReport()');
  api.check('каталог из 202 предметов и четыре слоя качества', report.count === 202 &&
    report.ok && report.qualityPaths.length === 4 &&
    new Set(report.qualityPaths).size === 4 &&
    report.qualityPaths.every(p => p.includes('/items/quality/') && p.endsWith('.svg')),
    JSON.stringify({ count: report.count, ok: report.ok, errors: report.errors, qualityPaths: report.qualityPaths }));

  const all = await api.ev('window.__mm6Debug.allItemLayers()');
  const badOrder = all.filter(e => {
    const roles = e.layers.map(l => l.role);
    const baseIndex = roles.indexOf('base');
    return baseIndex !== roles.filter(r => r === 'backdrop').length ||
      roles[roles.length - 1] !== 'quality' ||
      roles.slice(0, baseIndex).some(r => r !== 'backdrop') ||
      roles.filter(r => r === 'base').length !== 1 || roles.filter(r => r === 'quality').length !== 1;
  });
  const missing = all.filter(e => !e.layers.some(l => l.role === 'base' && l.src.includes('/items/')) ||
    !e.layers.some(l => l.role === 'quality' && l.src.includes('/quality/')));
  api.check('у всех 202 предметов есть база, подложки и качество в правильном порядке',
    all.length === 202 && !badOrder.length && !missing.length,
    JSON.stringify({ total: all.length, badOrder: badOrder.slice(0, 5).map(e => e.id), missing: missing.slice(0, 5).map(e => e.id) }));

  const folders = await api.ev(`(()=>{const all=window.__mm6Debug.allItemLayers();
    const base=all.map(e=>e.layers.find(l=>l.role==='base').src);
    return {weapon:base.filter(p=>p.includes('/weapons/')).length,
      armor:base.filter(p=>p.includes('/armor/')).length,
      head:base.filter(p=>p.includes('/head/')).length,
      boots:base.filter(p=>p.includes('/boots/')).length,
      containers:base.filter(p=>p.includes('/containers/')).length};})()`);
  api.check('оружие, броня, шлемы, сапоги и ёмкости имеют SVG по своей папке',
    folders.weapon === 70 && folders.armor + folders.head + folders.boots === 120 && folders.containers === 12 && folders.head > 0 && folders.boots > 0,
    JSON.stringify(folders));

  const paths = await api.ev(`[...new Set(window.__mm6Debug.allItemLayers()
    .flatMap(e=>e.layers.map(l=>l.src)))].sort()`);
  const fetched = await api.ev(`(async()=>{
    const urls=[...new Set(window.__mm6Debug.allItemLayers().flatMap(e=>e.layers.map(l=>l.src)))];
    let bad=[];
    await Promise.all(urls.map(async u=>{
      try { const r=await fetch(u); if(!r.ok) bad.push(u+' '+r.status); }
      catch(e){ bad.push(u+' '+e.message); }
    }));
    return {count:urls.length,bad};})()`);
  api.check('все уникальные SVG-слои загружаются без 4xx/5xx',
    paths.length === fetched.count && fetched.bad.length === 0,
    JSON.stringify({ unique: paths.length, bad: fetched.bad.slice(0, 8) }));

  const svgShape = await api.ev(`(async()=>{
    const urls=[...new Set(window.__mm6Debug.allItemLayers().flatMap(e=>e.layers.map(l=>l.src)))];
    const bad=[], elements=[], quality=[], bases=[];
    await Promise.all(urls.map(async u=>{
      const text=await (await fetch(u)).text();
      const role=(text.match(/data-(?:role|element|quality)="([a-z]+)"/)||[])[1]||null;
      if(!/viewBox="0 0 64 64"/.test(text)) bad.push(u+' viewBox');
      if(/<linearGradient|<radialGradient|<filter|image-rendering|<image\\b/i.test(text)) bad.push(u+' style');
      if(!/stroke="#241a14"/.test(text)) bad.push(u+' outline');
      if(u.includes('/elements/')) elements.push({u,role,backdrop:/data-role="backdrop"/.test(text)});
      if(u.includes('/quality/')) quality.push({u,role});
      if(u.includes('/weapons/')||u.includes('/armor/')||u.includes('/head/')||u.includes('/boots/')||u.includes('/containers/'))
        bases.push({u,shapes:(text.match(/<(path|circle|ellipse|rect|polygon)\\b/g)||[]).length});
    }));
    return {bad,elements,quality,badBases:bases.filter(b=>b.shapes<2)};})()`);
  api.check('SVG соответствуют стилю: viewBox, контур, без градиентов и фильтров',
    svgShape.bad.length === 0, JSON.stringify(svgShape.bad.slice(0, 8)));
  api.check('шестьelement-подложек и четыре слоя качества помечены ролью',
    svgShape.elements.length === 6 && svgShape.elements.every(e => e.backdrop) &&
    svgShape.quality.length === 4 && svgShape.quality.every(q => q.role && q.u.includes('/quality/')) &&
    svgShape.badBases.length === 0,
    JSON.stringify({ elements: svgShape.elements, quality: svgShape.quality, badBases: svgShape.badBases }));

  // Часть 3: эффекты качества и ауры школ видны в самих SVG, а не только в DOM.
  const fx = await api.ev(`(async()=>{
    const urls=[...new Set(window.__mm6Debug.allItemLayers().flatMap(e=>e.layers.map(l=>l.src)))];
    const texts=await Promise.all(urls.map(async u=>({u,t:await (await fetch(u)).text()})));
    const q={},el={};
    for(const {u,t} of texts){
      if(u.includes('/quality/')) q[u.split('/').pop().replace('.svg','')]={
        blots:(t.match(/<circle\\b/g)||[]).length, rust:/data-fx="rust-blots"/.test(t),
        glint:/data-fx="sharp-glint"/.test(t)&&t.includes('#ffffff')&&t.includes('#93c5fd'),
        edge:/data-fx="gold-edge-shine"/.test(t)&&t.includes('#e8c14a')&&/<ellipse\\b/.test(t),
        shimmer:/data-fx="magic-shimmer"/.test(t)&&(t.match(/<animate\\b/g)||[]).length>=4};
      if(u.includes('/elements/')) el[u.split('/').pop().replace('.svg','')]={
        school:(t.match(/data-school="([a-z]+)"/)||[])[1]||null,
        rings:(t.match(/<circle\\b/g)||[]).length, animate:/<animate\\b/.test(t),
        badge:/stroke-linejoin="miter"/.test(t)};
    }
    return {q,el};})()`);
  api.check('ржавчина — круглые кляксы, острый — бело-голубой блик, золото — кромка, магия — мерцание',
    fx.q.rusty.rust && fx.q.rusty.blots >= 12 &&
    fx.q.sharp.glint && fx.q.gold.edge &&
    fx.q.magic.shimmer && Object.keys(fx.q).length === 4,
    JSON.stringify(fx.q));
  api.check('аура каждой школы — мягкие анимированные пятна вместо жёсткого значка',
    ['flame','water','earth','wind','dark','light'].every(id =>
      fx.el[id] && fx.el[id].school === id && fx.el[id].rings >= 3 &&
      fx.el[id].animate && !fx.el[id].badge) && Object.keys(fx.el).length === 6,
    JSON.stringify(fx.el));

  const coverage = await api.ev(`(()=>{const all=window.__mm6Debug.allItemLayers();
    const q={},s={};for(const e of all)for(const l of e.layers){
      if(l.role==='quality') q[l.quality]=(q[l.quality]||0)+1;
      if(l.element) s[l.element]=(s[l.element]||0)+1;}
    return {total:all.length,q,s,daggers:all.filter(e=>e.id.startsWith('dagger')).length};})()`);
  api.check('все 202 предмета распределены по четырём качествам и шести школам',
    coverage.total === 202 && coverage.q.rusty === 31 && coverage.q.sharp === 19 &&
    coverage.q.gold === 57 && coverage.q.magic === 95 && coverage.daggers > 0 &&
    Object.keys(coverage.s).length === 6 && Object.values(coverage.s).every(n => n >= 20),
    JSON.stringify(coverage));

  const samples = ['dagger_rusty', 'sword_dark_ice', 'breastplate_flame', 'helmet_flame_6', 'boots_ice', 'crown_rusty'];
  const added = await api.ev(`(()=>{const d=window.__mm6Debug;
    d.toggleInventory(true);
    return ${JSON.stringify(samples)}.map(id=>({id,uid:d.addCatalogItem(id)}));})()`);
  await api.sleep(250);
  const cells = await api.ev(`(()=>{
    const rows=[...document.querySelectorAll('.invCell[data-uid]')];
    return ${JSON.stringify(added)}.map(s=>{
      const cell=rows.find(c=>c.dataset.uid===s.uid);
      if(!cell) return {id:s.id,missing:true};
      const imgs=[...cell.querySelectorAll('.itemStack img')].map(i=>({
        src:i.getAttribute('src'),role:i.dataset.role||null,element:i.dataset.element||null,
        quality:i.dataset.quality||null,mask:i.style.maskImage||null,
        w:+i.getBoundingClientRect().width.toFixed(1),h:+i.getBoundingClientRect().height.toFixed(1)}));
      return {id:s.id,imgs};
    });})()`);
  const badCells = cells.filter(c => c.missing || c.imgs.length < 2 ||
    c.imgs.some(i => i.w < 30 || i.h < 30) ||
    c.imgs[c.imgs.length - 1].role !== 'quality' ||
    !c.imgs[c.imgs.length - 1].mask ||
    !c.imgs.some(i => i.role === 'base' && c.imgs[c.imgs.length - 1].mask.includes(i.src)) ||
    c.imgs.some((i, n) => i.role === 'backdrop' && n > c.imgs.findIndex(x => x.role === 'base')));
  api.check('в инвентаре качество маскируется базой, иконки крупнее 30px',
    cells.length === samples.length && !badCells.length,
    JSON.stringify(badCells.length ? badCells : cells.map(c => ({ id: c.id, roles: c.imgs.map(i => i.role) }))));

  const twoSchools = cells.find(c => c.id === 'sword_dark_ice');
  api.check('две школы дают двеelement-подложки под мечом',
    !!twoSchools && twoSchools.imgs.filter(i => i.role === 'backdrop' && i.element).length === 2 &&
    ['dark', 'water'].every(id => twoSchools.imgs.some(i => i.element === id)),
    JSON.stringify(twoSchools ? twoSchools.imgs.map(i => ({ role: i.role, element: i.element })) : null));

  await api.ev(`window.__mm6Debug.forceShop('weapons')`);
  await api.sleep(200);
  const shopGeom = await api.ev('window.__mm6Debug.itemIconGeometry()');
  const heights = shopGeom.rows.filter(h => h > 0);
  api.check('в лавке иконки 34px, строки не разъезжаются, двойных обёрток нет',
    !shopGeom.doubleWrapped && shopGeom.shop && shopGeom.shop.w >= 34 && shopGeom.shop.h >= 34 &&
    heights.length > 0 && Math.max(...heights) - Math.min(...heights) <= 1,
    JSON.stringify(shopGeom));
  api.check('в инвентаре нет двойной обёртки .ic > .itemStack', !shopGeom.doubleWrapped, JSON.stringify(shopGeom.doubleWrapped));

  // Образцы по каждому качеству и каждой школе сохраняются скриншотами только во временную папку.
  const fxSamples = await api.ev(`(()=>{const all=window.__mm6Debug.allItemLayers();
    const find=p=>(all.find(p)||{}).id||null;
    return {
      rusty:find(e=>e.id.startsWith('dagger')&&e.layers.some(l=>l.quality==='rusty')),
      sharp:find(e=>e.id.startsWith('dagger')&&e.layers.some(l=>l.quality==='sharp')),
      gold:find(e=>e.id.startsWith('sword')&&e.layers.some(l=>l.quality==='gold')),
      magic:find(e=>e.id.startsWith('sword')&&e.layers.some(l=>l.quality==='magic')),
      flame:find(e=>e.layers.some(l=>l.element==='flame')),
      light:find(e=>e.layers.some(l=>l.element==='light')),
      water:find(e=>e.layers.some(l=>l.element==='water')),
      earth:find(e=>e.layers.some(l=>l.element==='earth')),
      wind:find(e=>e.layers.some(l=>l.element==='wind')),
      dark:find(e=>e.layers.some(l=>l.element==='dark'))};})()`);
  api.check('найдены образцы четырёх качеств и шести школ',
    Object.values(fxSamples).every(Boolean) && new Set(Object.values(fxSamples)).size === 10,
    JSON.stringify(fxSamples));

  const showSamples = async ids => {
    const shown = await api.ev(`(()=>{const d=window.__mm6Debug;
      const old=document.getElementById('part3Gallery'); if(old) old.remove();
      const ids=${JSON.stringify(ids)};
      const host=document.createElement('div'); host.id='part3Gallery';
      host.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;'+
        'display:flex;gap:10px;background:#05060c;padding:12px;border:2px solid #e8c14a;color:#fff;font:11px monospace';
      for(const [key,id] of Object.entries(ids)){
        if(!id) continue;
        const box=document.createElement('div'); box.style.cssText='width:96px;text-align:center';
        const stack=document.createElement('div');
        stack.style.cssText='position:relative;width:80px;height:80px;margin:0 auto 4px';
        for(const l of d.catalogLayers(id)){
          const im=document.createElement('img'); im.src=l.src;
          im.style.cssText='position:absolute;inset:0;width:80px;height:80px';
          if(l.role==='quality'&&l.mask){
            const m="url('"+l.mask+"')";
            im.style.webkitMaskImage=m; im.style.maskImage=m;
            im.style.webkitMaskSize='contain'; im.style.maskSize='contain';
            im.style.webkitMaskRepeat='no-repeat'; im.style.maskRepeat='no-repeat';
            im.style.webkitMaskPosition='center'; im.style.maskPosition='center';
          }
          stack.appendChild(im);
        }
        box.appendChild(stack);
        const label=document.createElement('div'); label.textContent=key+' · '+id; box.appendChild(label);
        host.appendChild(box);
      }
      document.body.appendChild(host); return host.childElementCount;})()`);
    await api.sleep(420);
    return shown;
  };
  const qualityIds = Object.fromEntries(Object.entries(fxSamples).slice(0, 4));
  const schoolIds = Object.fromEntries(Object.entries(fxSamples).slice(4));
  const files = [];
  for (const [name, ids] of [['quality', qualityIds], ['schools', schoolIds]]) {
    const shown = await showSamples(ids);
    const file = join(tmpdir(), 'mm6-part3-' + name + '.png');
    await api.screenshot(file);
    files.push({ name, shown, file, size: statSync(file).size });
  }
  api.check('скриншоты образцов качества и школ сохранены во временную папку',
    files.length === 2 && files.every(f => f.shown >= 4 && f.size > 5000),
    JSON.stringify(files));
  await api.ev(`(()=>{const g=document.getElementById('part3Gallery');if(g)g.remove();return true;})()`);
});
