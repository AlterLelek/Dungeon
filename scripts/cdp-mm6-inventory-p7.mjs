// CDP-проверка седьмой части: мастерство ёмкостей, манекен, контекстные меню и алхимия.
// Запуск: node scripts/cdp-mm6-inventory-p7.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('INVENTORY PART 7', async api => {
  await api.startGame();
  await api.ev(`(()=>{const d=window.__mm6Debug;
    d.setPartyGold(500);
    d.toggleInventory(true);
    return true;})()`);
  await api.ev(`(()=>{const g=window.__mm6State();g.party.forEach((h,i)=>window.__mm6Debug.setGuildRank(i,'expert'));return true;})()`);
  await api.sleep(150);

  const doll = await api.ev(`window.__mm6Debug.paperDollLayoutReport()`);
  api.check('15 слотов манекена уникальны и не перекрываются',
    doll.slots.length === 15 && doll.unique && doll.overlaps.length === 0,
    JSON.stringify({ count: doll.slots.length, unique: doll.unique, overlaps: doll.overlaps }));
  const hits = await api.ev(`(()=>{const stage=document.querySelector('#mannequin .mq-stage');
    stage.scrollIntoView({block:'center',inline:'center'});
    return window.__mm6Debug.paperDollLayoutReport().slots.map(s=>{
      const el=document.elementFromPoint(s.x+s.w/2,s.y+s.h/2), found=el&&el.closest('[data-slot]');
      return {id:s.id,hit:found?found.dataset.slot:null};});})()`);
  api.check('центр каждого слота манекена нажимается отдельно',
    hits.length === 15 && hits.every(h => h.id === h.hit),
    JSON.stringify(hits.filter(h => h.id !== h.hit)));

  const grid = await api.ev(`window.__mm6Debug.inventoryGridReport()`);
  api.check('сетка инвентаря фиксирована 9×16 и не прокручивается',
    grid.columns === 9 && grid.rows === 16 && grid.cells === 144 &&
    grid.overflow === 'hidden' && grid.scroll.content <= grid.scroll.height,
    JSON.stringify(grid));

  const p7 = await api.ev(`window.__mm6Debug.inventoryPart7Report()`);
  api.check('вкладки ёмкостей показывают мастерство и занято x/y',
    p7.containers.length === 5 && p7.containers.every(c =>
      /Простой|Изысканный|Волшебный/.test(c.label) && /\d+\/\d+/.test(c.label)),
    JSON.stringify(p7.containers.map(c => c.label)));

  await api.ev(`(()=>{const g=window.__mm6State();g.party.forEach((h,i)=>window.__mm6Debug.setGuildRank(i,'leading'));return true;})()`);
  const up1 = await api.ev(`(()=>{const g=window.__mm6State(),before={gold:g.gold,cap:g.containers.pockets.capacity};
    const ok=window.__mm6Debug.upgradeContainer('pockets'),st=g.containers.pockets;
    return {ok,before,after:{gold:g.gold,cap:st.capacity,up:st.upgrade,tier:st.tier,mastery:st.mastery}};})()`);
  api.check('первое улучшение требует «Изысканный» и добавляет слоты за золото',
    up1.ok && up1.after.up === 1 && up1.after.mastery === 'leading' && up1.after.tier === 'reinforced' &&
    up1.after.cap > up1.before.cap && up1.after.gold < up1.before.gold,
    JSON.stringify(up1));

  await api.ev(`document.querySelector('.containerTab[data-container="pockets"]').click()`);
  await api.sleep(80);
  const upgradeCard = await api.ev(`(()=>{const c=[...document.querySelectorAll('.invCell')].find(x=>/Улучшить Карманы/.test(x.title));
    return c?c.title:null;})()`);
  api.check('карточка улучшения показывает переход мастерства и x/y',
    !!upgradeCard && /Изысканный → Волшебный/.test(upgradeCard) && /\d+\/\d+ → \d+/.test(upgradeCard),
    upgradeCard || 'нет карточки');

  await api.ev(`(()=>{const g=window.__mm6State();g.party.forEach((h,i)=>window.__mm6Debug.setGuildRank(i,'expert'));return true;})()`);
  const up2 = await api.ev(`(()=>{const g=window.__mm6State(),before=g.containers.pockets.capacity;
    const ok=window.__mm6Debug.upgradeContainer('pockets'),st=g.containers.pockets;
    return {ok,before,cap:st.capacity,up:st.upgrade,tier:st.tier,mastery:st.mastery};})()`);
  const up3 = await api.ev(`window.__mm6Debug.upgradeContainer('pockets')`);
  const pockets = await api.ev(`window.__mm6Debug.inventoryPart7Report().containers.find(c=>c.id==='pockets')`);
  api.check('второе улучшение даёт «Волшебный», третье запрещено',
    up2.ok && up2.up === 2 && up2.mastery === 'expert' && up2.tier === 'enchanted' && up2.cap > up2.before &&
    up3 === false && /Волшебный Карманы \d+\/\d+/.test(pockets.label),
    JSON.stringify({ up2, up3, label: pockets.label }));

  await api.ev(`document.querySelector('.containerTab[data-container="pockets"]').click()`);
  const herbUid = await api.ev(`window.__mm6Debug.addItemBySpec({id:'sage',type:'herb',name:'Шалфей',icon:'🌿',effect:'hp',value:12,cost:1,sell:1})`);
  const scrollUid = await api.ev(`window.__mm6Debug.addItemBySpec({id:'scroll_fire',type:'scroll',name:'Свиток огня',icon:'📜',spell:'fire',cost:12,sell:6})`);
  const ctxButtons = await api.ev(`[...document.querySelectorAll('.invCell .ctxBtn')].map(b=>b.dataset.context)`);
  api.check('у трав и свитков есть кнопка контекстного меню',
    ctxButtons.includes(herbUid) && ctxButtons.includes(scrollUid),
    JSON.stringify({ herbUid, scrollUid, ctxButtons: ctxButtons.length }));

  await api.ev(`document.querySelector('.invCell .ctxBtn[data-context="${herbUid}"]').click()`);
  const herbCtx = await api.ev(`window.__mm6Debug.inventoryPart7Report().context`);
  api.check('меню травы открывается с действиями',
    herbCtx.open && herbCtx.uid === herbUid && /Шалфей/.test(herbCtx.title) &&
    herbCtx.actions.some(a => /Использовать траву/.test(a)) &&
    herbCtx.actions.some(a => /Рецепты алхимии/.test(a)),
    JSON.stringify(herbCtx));

  await api.ev(`[...document.querySelectorAll('#invContext button')].find(b=>/Рецепты алхимии/.test(b.textContent)).click()`);
  const alchemy = await api.ev(`window.__mm6Debug.inventoryPart7Report().alchemy`);
  api.check('меню открывает простую таблицу алхимии',
    alchemy.present && alchemy.rows.length >= 8 && alchemy.rows.every(r => r.id && typeof r.ready === 'boolean'),
    JSON.stringify({ rows: alchemy.rows.length }));

  await api.ev(`(()=>{const d=window.__mm6Debug;
    d.addItemBySpec({id:'mint',type:'herb',name:'Мята',icon:'🌿',effect:'mana',value:3,cost:1,sell:1});
    d.addItemBySpec({id:'fern',type:'herb',name:'Папоротник',icon:'🌿',effect:'mana',value:6,cost:1,sell:1});
    return true;})()`);
  const ready = await api.ev(`window.__mm6Debug.inventoryPart7Report().alchemy.rows.find(r=>r.id==='potion_mp')`);
  api.check('доступный рецепт подсвечивается в таблице', !!ready && ready.ready, JSON.stringify(ready));
  await api.ev(`document.querySelector('#alchemyTable button[data-craft="potion_mp"]').click()`);
  const crafted = await api.ev(`(()=>({toast:document.getElementById('toast').textContent,
    count:window.__mm6State().bag.filter(i=>i.id==='potion_mp').length}))()`);
  api.check('алхимия варит зелье прямо из таблицы',
    /Создано/.test(crafted.toast) && crafted.count >= 1, JSON.stringify(crafted));

  const herbUseUid = await api.ev(`window.__mm6Debug.addItemBySpec({id:'sage',type:'herb',name:'Шалфей',icon:'🌿',effect:'hp',value:12,cost:1,sell:1})`);
  await api.ev(`document.querySelector('.invCell .ctxBtn[data-context="${herbUseUid}"]').click()`);
  await api.ev(`[...document.querySelectorAll('#invContext button')].find(b=>/Использовать траву/.test(b.textContent)).click()`);
  const used = await api.ev(`(()=>({exists:window.__mm6State().bag.some(i=>i.uid==='${herbUseUid}'),
    toast:document.getElementById('toast').textContent}))()`);
  api.check('меню травы применяет эффект и расходует предмет',
    !used.exists && /Использовано/.test(used.toast), JSON.stringify(used));

  await api.ev(`[...document.querySelectorAll('#invTabs button')].find(b=>b.textContent==='Свитки').click()`);
  const scrollCtxUid = await api.ev(`window.__mm6Debug.addItemBySpec({id:'scroll_fire',type:'scroll',name:'Свиток огня',icon:'📜',spell:'fire',cost:12,sell:6})`);
  await api.ev(`document.querySelector('.invCell .ctxBtn[data-context="${scrollCtxUid}"]').click()`);
  const scrollCtx = await api.ev(`window.__mm6Debug.inventoryPart7Report().context`);
  api.check('меню свитка открывается с изучением',
    scrollCtx.open && scrollCtx.uid === scrollCtxUid &&
    scrollCtx.actions.some(a => /Изучить/.test(a)), JSON.stringify(scrollCtx));
  await api.ev(`[...document.querySelectorAll('#invContext button')].find(b=>/Изучить/.test(b.textContent)).click()`);
  const learned = await api.ev(`(()=>({spells:window.__mm6State().party[0].spells,
    exists:window.__mm6State().bag.some(i=>i.uid==='${scrollCtxUid}')}))()`);
  api.check('свиток через меню изучает заклинание и расходуется',
    learned.spells.includes('fire') && !learned.exists, JSON.stringify(learned));

  const finalGrid = await api.ev(`window.__mm6Debug.inventoryGridReport()`);
  const finalDoll = await api.ev(`window.__mm6Debug.paperDollLayoutReport()`);
  api.check('после всех действий сетка и манекен остаются целыми',
    finalGrid.columns === 9 && finalGrid.rows === 16 && finalGrid.scroll.content <= finalGrid.scroll.height &&
    finalDoll.overlaps.length === 0,
    JSON.stringify({ grid: finalGrid, overlaps: finalDoll.overlaps }));
});
