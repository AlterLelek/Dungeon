// CDP-проверка ЧАСТИ 3: SVG-портреты в медальонах, строка состояния, панель отряда.
// Запуск: node scripts/cdp-mm6-portraits-p3.mjs
import { runCdp } from './cdp-lib.mjs';

await runCdp('PORTRAITS PART 3', async api => {
  await api.ev(`location.href='${api.base}/index.html'`);
  await api.waitFor(`document.readyState==='complete'`, 8000);

  const assets = await api.ev(`(async()=>{
    const out=[];
    for(const cls of ['warrior','paladin','mage']){
      for(let v=0;v<4;v++){
        const url='assets/sprites/portraits/'+cls+'_'+v+'.svg';
        const text=await fetch(url).then(r=>r.text());
        const doc=new DOMParser().parseFromString(text,'image/svg+xml');
        const img=new Image(); img.src=url; await img.decode();
        out.push({cls,v,url,viewBox:doc.documentElement.getAttribute('viewBox'),
          loaded:img.naturalWidth>0,parseError:!!doc.querySelector('parsererror'),
          layers:['medallion','face','hair','gear','status'].filter(id=>doc.querySelector('#'+id)),
          title:doc.querySelector('title')&&doc.querySelector('title').textContent,
          bad:/linearGradient|radialGradient|<filter|<image|\\.png|<rect[^>]*\\b(?:rx|ry)=/i.test(text),
          markup:text});
      }
    }
    return out;
  })()`);

  api.check('12 SVG-портретов: 3 класса по 4 варианта',
    assets.length === 12 && assets.every(a => a.loaded && !a.parseError && a.viewBox === '0 0 512 512'),
    JSON.stringify(assets.filter(a => !a.loaded || a.parseError).map(a => a.url)));
  api.check('в каждом портрете есть слои медальона, лица, волос, экипировки и статуса',
    assets.every(a => a.layers.length === 5),
    JSON.stringify(assets.filter(a => a.layers.length !== 5).map(a => ({ url: a.url, layers: a.layers }))));
  api.check('портреты соответствуют STYLE-контракту (без градиентов, фильтров, PNG и скруглений)',
    assets.every(a => !a.bad), JSON.stringify(assets.filter(a => a.bad).map(a => a.url)));
  api.check('варианты _0.._3 действительно различаются',
    ['warrior', 'paladin', 'mage'].every(cls => {
      const marks = assets.filter(a => a.cls === cls).map(a => a.markup);
      return new Set(marks).size === 4;
    }), JSON.stringify(assets.map(a => [a.url, a.markup.length])));

  const manifest = await api.ev(`fetch('assets/manifest.json').then(r=>r.json())`);
  const entries = manifest.filter(e => e.type === 'portrait');
  api.check('12 портретов зарегистрированы в манифесте с типом portrait',
    entries.length === 12 && assets.every(a => entries.some(e => e.path === a.url)),
    JSON.stringify(entries.map(e => e.path)));

  await api.ev(`location.href='${api.base}/games/mm6/index.html'`);
  await api.waitFor(`!!window.__mm6Debug`, 8000);
  await api.ev(`document.getElementById('heroName').value='Тереза'; window.__mm6Debug.startGame()`);
  await api.waitFor(`!!window.__mm6State() && document.querySelectorAll('#party .pcard').length===3`, 8000);

  const report = await api.ev(`window.__mm6Debug.portraitReport()`);
  api.check('портреты показаны в нижней панели отряда',
    report.cards.length === 3 && report.cards.every(c =>
      c.visible && c.loaded && /^\.\.\/\.\.\/assets\/sprites\/portraits\/(warrior|paladin|mage)_[0-3]\.svg$/.test(c.src)),
    JSON.stringify(report.cards));
  api.check('строка состояния имеет вид «Имя, Класс: Состояние»',
    report.cards.every(c => c.status === c.expected &&
      /^«.+?, .+: (Хорошее|Ранен|Тяжёло|Без сознания)»$/.test(c.status)) &&
    report.cards[0].status === '«Тереза, Воин: Хорошее»',
    JSON.stringify(report.cards.map(c => c.status)));
  api.check('класс портрета совпадает с классом героя',
    report.cards.every(c => c.cls === ['warrior', 'mage', 'paladin'][c.hero]),
    JSON.stringify(report.cards.map(c => ({ hero: c.hero, cls: c.cls, variant: c.variant }))));

  await api.ev(`window.__mm6Debug.setHeroHp(0,20)`);
  const wounded = await api.ev(`window.__mm6Debug.portraitReport().cards[0].status`);
  api.check('строка состояния реагирует на HP', wounded === '«Тереза, Воин: Тяжёло»', wounded);
});
