// CDP-проверка ЧАСТИ 5: 10 классов × 4 портрета, крупное лицо в овале,
// волосы и экипировка не заходят на центр лица. Запуск: node scripts/cdp-mm6-portraits-p3.mjs
import { runCdp } from './cdp-lib.mjs';

await runCdp('PORTRAITS PART 5', async api => {
  await api.ev(`location.href='${api.base}/index.html'`);
  await api.waitFor(`document.readyState==='complete'`, 8000);

  const classes = ['warrior', 'mage', 'paladin', 'angel', 'archer', 'druid', 'rogue', 'amazon', 'dwarf', 'dwarfmage'];
  const assets = await api.ev(`(async()=>{
    const classes=${JSON.stringify(classes)}, out=[];
    const host=document.createElement('div');
    host.style.cssText='position:absolute;left:-9999px;top:0;width:512px;height:512px';
    document.body.appendChild(host);
    for(const cls of classes){
      for(let v=0;v<4;v++){
        const url='assets/sprites/portraits/'+cls+'_'+v+'.svg';
        const text=await fetch(url).then(r=>r.text());
        const doc=new DOMParser().parseFromString(text,'image/svg+xml');
        const img=new Image(); img.src=url; await img.decode();
        const svg=doc.documentElement; host.replaceChildren(svg);
        const oval=svg.querySelector('#faceOval');
        const face=oval?{cx:+oval.getAttribute('cx'),cy:+oval.getAttribute('cy'),
          rx:+oval.getAttribute('rx'),ry:+oval.getAttribute('ry')}:null;
        const shapes=[];
        for(const id of ['hair','gear','status']){
          const g=svg.querySelector('#'+id);
          if(!g) continue;
          for(const el of g.querySelectorAll('path,ellipse,circle,polygon')){
            const b=el.getBBox();
            shapes.push({id,x:b.x,y:b.y,w:b.width,h:b.height});
          }
        }
        out.push({cls,v,url,viewBox:svg.getAttribute('viewBox'),
          loaded:img.naturalWidth>0,parseError:svg.tagName==='parsererror'||!!svg.querySelector('parsererror'),
          layers:['medallion','face','hair','gear','status'].filter(id=>svg.querySelector('#'+id)),
          face,shapes,
          title:svg.querySelector('title')&&svg.querySelector('title').textContent,
          bad:/linearGradient|radialGradient|<filter|<image|\\.png|<rect[^>]*\\b(?:rx|ry)=/i.test(text),
          markup:text});
      }
    }
    host.remove();
    return out;
  })()`);

  api.check('40 SVG-портретов: 10 классов по 4 варианта',
    assets.length === 40 && assets.every(a => a.loaded && !a.parseError && a.viewBox === '0 0 512 512'),
    JSON.stringify(assets.filter(a => !a.loaded || a.parseError).map(a => a.url)));
  api.check('в каждом портрете есть слои медальона, лица, волос, экипировки и статуса',
    assets.every(a => a.layers.length === 5),
    JSON.stringify(assets.filter(a => a.layers.length !== 5).map(a => ({ url: a.url, layers: a.layers }))));
  api.check('портреты соответствуют STYLE-контракту (без градиентов, фильтров, PNG и скруглений)',
    assets.every(a => !a.bad), JSON.stringify(assets.filter(a => a.bad).map(a => a.url)));
  api.check('варианты _0.._3 действительно различаются',
    classes.every(cls => new Set(assets.filter(a => a.cls === cls).map(a => a.markup)).size === 4),
    JSON.stringify(assets.map(a => [a.url, a.markup.length])));
  api.check('лицо крупное и отцентрировано в овале',
    assets.every(a => a.face && a.face.cx === 256 && a.face.cy === 248 &&
      a.face.rx >= 90 && a.face.ry >= 100),
    JSON.stringify(assets.filter(a => !a.face || a.face.rx < 90 || a.face.ry < 100).map(a => a.url)));
  const across = assets.filter(a => a.shapes.some(s => {
    const core = { x: 176, y: 180, w: 160, h: 140 };
    return Math.min(s.x + s.w, core.x + core.w) - Math.max(s.x, core.x) > 1 &&
      Math.min(s.y + s.h, core.y + core.h) - Math.max(s.y, core.y) > 1;
  })).map(a => a.url);
  api.check('волосы, экипировка и статус не проходят поперёк лица',
    across.length === 0, JSON.stringify(across));

  const manifest = await api.ev(`fetch('assets/manifest.json').then(r=>r.json())`);
  const entries = manifest.filter(e => e.type === 'portrait');
  api.check('40 портретов зарегистрированы в манифесте после генерации файлов',
    entries.length === 40 && assets.every(a => entries.some(e => e.path === a.url)),
    JSON.stringify(entries.map(e => e.path)));

  await api.ev(`location.href='${api.base}/games/mm6/index.html'`);
  await api.waitFor(`!!window.__mm6Debug`, 8000);
  await api.ev(`document.getElementById('heroName').value='Тереза'; window.__mm6Debug.startGame()`);
  await api.waitFor(`!!window.__mm6State() && document.querySelectorAll('#party .pcard').length===3`, 8000);

  const report = await api.ev(`window.__mm6Debug.portraitReport()`);
  api.check('портреты показаны в нижней панели отряда',
    report.cards.length === 3 && report.cards.every(c =>
      c.visible && c.loaded && /^\.\.\/\.\.\/assets\/sprites\/portraits\/[a-z]+_[0-3]\.svg$/.test(c.src)),
    JSON.stringify(report.cards));
  api.check('строка состояния имеет вид «Имя, Класс: Состояние»',
    report.cards.every(c => c.status === c.expected &&
      /^«.+?, .+: (Хорошее|Ранен|Тяжёло|Без сознания)»$/.test(c.status)) &&
    report.cards[0].status === '«Тереза, Воин: Хорошее»',
    JSON.stringify(report.cards.map(c => c.status)));
  api.check('класс портрета совпадает с ключом класса героя',
    report.cards.every(c => c.cls === ['warrior', 'mage', 'paladin'][c.hero]),
    JSON.stringify(report.cards.map(c => ({ hero: c.hero, cls: c.cls, variant: c.variant }))));

  await api.ev(`window.__mm6Debug.setHeroHp(0,20)`);
  const wounded = await api.ev(`window.__mm6Debug.portraitReport().cards[0].status`);
  api.check('строка состояния реагирует на HP', wounded === '«Тереза, Воин: Тяжёло»', wounded);
});
