// CDP-проверка шестой части: горизонтальные вкладки лавки в шапке и полная вкладка «Продажа».
// Запуск: node scripts/cdp-mm6-shop-p6.mjs
import { runCdp } from './cdp-lib.mjs';

const EXPECTED = ['Оружие', 'Броня', 'Магия', 'Камни', 'Травы', 'Продажа'];
const IDS = ['weapons', 'armor', 'magic', 'stones', 'herbs', 'sale'];

runCdp('SHOP PART 6', async api => {
  await api.startGame();
  const all = ['weapons', 'armory', 'forge', 'armor', 'magic', 'jeweler', 'market', 'tavern', 'inn', 'church', 'hall'];
  const reports = [];
  for (const type of all) {
    reports.push({ type, report: await api.ev(`window.__mm6Debug.forceShop('${type}')`) });
  }
  api.check('все лавки открываются с отчётом', reports.every(r => r.report && r.report.ok),
    JSON.stringify(reports.filter(r => !r.report || !r.report.ok).map(r => ({ type: r.type, errors: r.report && r.report.errors }))));
  api.check('в шапке каждой лавки ровно шесть вкладок в нужном порядке',
    reports.every(r => r.report && r.report.tabs.length === 6 &&
      JSON.stringify(r.report.tabs.map(t => t.id)) === JSON.stringify(IDS) &&
      JSON.stringify(r.report.tabs.map(t => t.label.replace(/^[^\s]+\s+/, ''))) === JSON.stringify(EXPECTED)),
    JSON.stringify(reports[0].report && reports[0].report.tabs));

  const geometry = await api.ev(`(()=>{const host=document.getElementById('shopTabs');
    const buttons=[...host.querySelectorAll('button[data-shop-tab]')].map(b=>{const r=b.getBoundingClientRect();
      return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});
    return {host:{y:+host.getBoundingClientRect().y.toFixed(1),wrap:getComputedStyle(host).flexWrap},buttons};})()`);
  api.check('вкладки образуют одну горизонтальную строку',
    geometry.host.wrap === 'nowrap' && geometry.buttons.length === 6 &&
    geometry.buttons.every((b, i) => b.y === geometry.buttons[0].y && b.w > 0 && (!i || b.x > geometry.buttons[i - 1].x)),
    JSON.stringify(geometry));

  const headerSale = await api.ev(`(()=>({header:!!document.querySelector('#shopTabs [data-sale="1"]'),
    bottom:!!document.querySelector('#shopList [data-sale="1"]')}))()`);
  api.check('«Продажа» — вкладка в шапке, а не кнопка внизу', headerSale.header && !headerSale.bottom,
    JSON.stringify(headerSale));

  const service = reports.filter(r => ['tavern', 'inn', 'church', 'hall'].includes(r.type));
  api.check('в лавках без торговли вкладка «Продажа» неактивна',
    service.every(r => r.report.tabs.find(t => t.id === 'sale').disabled) &&
    reports.filter(r => !['tavern', 'inn', 'church', 'hall'].includes(r.type))
      .every(r => !r.report.tabs.find(t => t.id === 'sale').disabled),
    JSON.stringify(service.map(r => ({ type: r.type, sale: r.report.tabs.find(t => t.id === 'sale') }))));

  await api.ev(`window.__mm6Debug.forceShop('market')`);
  const before = await api.ev(`window.__mm6Debug.shopReport()`);
  api.check('рынок открывается на вкладке «Травы»', before.category === 'herbs' &&
    before.tabs.find(t => t.id === 'herbs').selected && !before.saleOnly,
    JSON.stringify({ category: before.category, tabs: before.tabs }));
  await api.ev(`document.querySelector('#shopTabs [data-shop-tab="sale"]').click()`);
  const sale = await api.ev(`window.__mm6Debug.shopReport()`);
  const saleSections = await api.ev(`[...document.querySelectorAll('#shopList .sec')]
    .filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent)`);
  api.check('вкладка «Продажа» показывает только продажу',
    sale.saleOnly && sale.category === 'sale' && saleSections.length === 1 && /Продажа/.test(saleSections[0]) &&
    sale.tabs.find(t => t.id === 'sale').selected,
    JSON.stringify({ saleOnly: sale.saleOnly, category: sale.category, sections: saleSections }));
  await api.ev(`document.querySelector('#shopTabs [data-shop-tab="herbs"]').click()`);
  const back = await api.ev(`window.__mm6Debug.shopReport()`);
  const herbSections = await api.ev(`[...document.querySelectorAll('#shopList .sec')]
    .filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent)`);
  api.check('возврат на раздел восстанавливает товары',
    !back.saleOnly && back.category === 'herbs' && herbSections.length > 1 &&
    herbSections.some(s => /Травы/.test(s)),
    JSON.stringify({ category: back.category, sections: herbSections }));

  await api.ev(`window.__mm6Debug.forceShop('magic')`);
  const magic = await api.ev(`window.__mm6Debug.shopReport()`);
  api.check('магическая лавка сохраняет точный заголовок и активную вкладку «Магия»',
    magic.displayedTitle === 'Магазин Магии' && magic.category === 'magic' &&
    magic.tabs.find(t => t.id === 'magic').selected,
    JSON.stringify({ title: magic.displayedTitle, category: magic.category }));
});
