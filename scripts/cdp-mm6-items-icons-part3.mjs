// Часть 3 [ГОБОРЕНО]: качество маскируется силуэтом предмета, кляксы/блики/кромка/
// мерцание живут в SVG, ауры школ мягкие и анимированные; слой не превращается в PNG.
// Запуск: node scripts/cdp-mm6-items-icons-part3.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('ITEMS ICONS PART 3', async api => {
  await api.startGame();
  await api.sleep(150);

  const all = await api.ev('window.__mm6Debug.allItemLayers()');
  const badMask = all.filter(e => {
    const base = e.layers.find(l => l.role === 'base');
    const quality = e.layers.find(l => l.role === 'quality');
    return !base || !quality || quality.mask !== base.src || !/\.svg$/.test(quality.src);
  });
  api.check('у всех 202 предметов качество наложено маской силуэта базы',
    all.length === 202 && badMask.length === 0,
    JSON.stringify({ total: all.length, bad: badMask.slice(0, 5).map(e => e.id) }));

  const badShape = all.filter(e => {
    const roles = e.layers.map(l => l.role);
    const base = roles.indexOf('base');
    return base < 0 || roles.slice(0, base).some(r => r !== 'backdrop') ||
      roles[roles.length - 1] !== 'quality' ||
      roles.filter(r => r === 'base').length !== 1 ||
      roles.filter(r => r === 'quality').length !== 1;
  });
  api.check('слои идут в порядке: подложки → база → качество, по одному слою базы и качества',
    badShape.length === 0, JSON.stringify(badShape.slice(0, 5).map(e => ({ id: e.id,
      roles: e.layers.map(l => l.role) }))));

  const fx = await api.ev(`(async()=>{
    const urls=[...new Set(window.__mm6Debug.allItemLayers().flatMap(e=>e.layers.map(l=>l.src)))];
    const texts=await Promise.all(urls.map(u=>fetch(u).then(r=>r.text())));
    const q={},el={},badStyle=[];
    texts.forEach((t,n)=>{
      const u=urls[n];
      if(/\\.svg$/.test(u)){
        if(!/viewBox="0 0 64 64"/.test(t)) badStyle.push(u+' viewBox');
        if(/<image\\b|linearGradient|radialGradient|<filter/i.test(t)) badStyle.push(u+' style');
      }
      if(u.includes('/quality/')) q[u.split('/').pop().replace('.svg','')]={
        blots:(t.match(/<circle\\b/g)||[]).length, rust:/data-fx="rust-blots"/.test(t),
        glint:/data-fx="sharp-glint"/.test(t)&&t.includes('#ffffff')&&t.includes('#93c5fd'),
        edge:/data-fx="gold-edge-shine"/.test(t)&&t.includes('#e8c14a')&&/<ellipse\\b/.test(t),
        shimmer:/data-fx="magic-shimmer"/.test(t)&&(t.match(/<animate\\b/g)||[]).length>=4};
      if(u.includes('/elements/')) el[u.split('/').pop().replace('.svg','')]={
        school:(t.match(/data-school="([a-z]+)"/)||[])[1]||null,
        rings:(t.match(/<circle\\b/g)||[]).length,
        animate:/<animate\\b/.test(t)&&/school-aura/.test(t)};
    });
    return {q,el,badStyle};})()`);
  api.check('SVG по стилю: 64×64, без градиентов, фильтров и растровых вставок',
    fx.badStyle.length === 0, JSON.stringify(fx.badStyle.slice(0, 8)));
  api.check('кляксы ржавчины, острый блик, золотая кромка и магическое мерцание',
    Object.keys(fx.q).length === 4 && fx.q.rusty.rust && fx.q.rusty.blots >= 12 &&
    fx.q.sharp.glint && fx.q.gold.edge && fx.q.magic.shimmer, JSON.stringify(fx.q));
  api.check('шесть школ дают мягкие анимированные ауры',
    Object.keys(fx.el).length === 6 &&
    ['flame','water','earth','wind','dark','light'].every(id =>
      fx.el[id] && fx.el[id].school === id && fx.el[id].rings >= 3 && fx.el[id].animate),
    JSON.stringify(fx.el));

  // Маска обязана доезжать до DOM инвентаря и лавки, а не оставаться только в данных.
  await api.ev(`window.__mm6Debug.toggleInventory(true);
    window.__mm6Debug.addItemBySpec({type:'weapon',name:'Меч проверки',wkind:'sword',
      quality:3,dmg:7,cost:10,sell:5}); true`);
  await api.sleep(180);
  const dom = await api.ev(`(()=>{
    const quality=[...document.querySelectorAll('.invCell img[data-quality]')];
    const img=quality[0];
    const cs=img?getComputedStyle(img):null;
    const mask=cs?(cs.maskImage||cs.webkitMaskImage||''):'';
    return {count:quality.length,mask,doubleWrapped:!!document.querySelector('.ic > .itemStack'),
      stack:!!(img&&img.parentElement&&img.parentElement.classList.contains('itemStack'))};})()`);
  api.check('в DOMquality-слой имеет маску базы и не обёрнут двойным span',
    dom.count > 0 && /url\(/.test(dom.mask) && /\.(svg|png)/.test(dom.mask) &&
    dom.stack && !dom.doubleWrapped, JSON.stringify(dom));
  await api.ev(`window.__mm6Debug.toggleInventory(false);true`);
});
