// Часть 1.5: окна не пересоздаются и не закрываются сами после транзакций.
// Запуск: node scripts/cdp-mm6-window-persistence.mjs
import { runCdp } from './cdp-lib.mjs';

const mark = `(()=>{
  ['shop','shopList','shopArt','shopSeller'].forEach((id,i)=>{
    const el=document.getElementById(id); if(el) el.dataset.persistMark='m'+i;
  });
  return true;
})()`;
const report = 'window.__mm6Debug.windowPersistenceReport()';
const stable = (before, after) => !!after.open && after.shopMark === before.shopMark &&
  after.listMark === before.listMark && after.artMark === before.artMark &&
  after.sellerMark === before.sellerMark &&
  !!after.sellerRect && !!before.sellerRect &&
  Math.abs(after.sellerRect.x - before.sellerRect.x) <= 1 &&
  Math.abs(after.sellerRect.y - before.sellerRect.y) <= 1 &&
  Math.abs(after.sellerRect.w - before.sellerRect.w) <= 1 &&
  Math.abs(after.sellerRect.h - before.sellerRect.h) <= 1;

runCdp('WINDOW PERSISTENCE PART 1.5', async api => {
  await api.startGame();
  await api.sleep(150);
  await api.ev(mark);

  // Покупка обновляет золото и список, но не окно и не сцену лавки.
  await api.ev(`window.__mm6Debug.setPartyGold(5000); window.__mm6Debug.forceShop('weapons'); true`);
  const buyBefore = await api.ev(report);
  const buyLenBefore = await api.ev(`document.getElementById('shopList').textContent.length`);
  const bought = await api.ev(`(()=>{const b=[...document.querySelectorAll('#shopList button.act')]
    .find(x=>!x.disabled&&/🪙/.test(x.textContent||'')); if(!b) return false; b.click(); return true;})()`);
  await api.sleep(120);
  const buyAfter = await api.ev(report);
  const buyLenAfter = await api.ev(`document.getElementById('shopList').textContent.length`);
  api.check('покупка: окно открыто, золото и список обновлены, узлы сцены те же',
    bought && stable(buyBefore, buyAfter) && buyAfter.gold !== buyBefore.gold && buyLenAfter !== buyLenBefore,
    JSON.stringify({ bought, gold: [buyBefore.gold, buyAfter.gold], list: [buyLenBefore, buyLenAfter],
      seller: [buyBefore.sellerRect, buyAfter.sellerRect] }));
  // Реплика NPC живёт 3.2 с: за это время окно лавки обязано остаться на месте.
  await api.sleep(3400);
  const buyLater = await api.ev(report);
  api.check('покупка: окно не исчезает после реплики продавца', stable(buyBefore, buyLater),
    JSON.stringify(buyLater));

  // Продажа тоже обновляет содержимое внутри всё того же окна.
  await api.ev(`window.__mm6Debug.addItemBySpec({type:'misc',name:'Проверочный товар',
    icon:'•',cost:10,sell:5}); window.__mm6Debug.forceShop('weapons');
    window.__mm6Debug.toggleShopSale(); true`);
  const sellBefore = await api.ev(report);
  const sold = await api.ev(`(()=>{const b=document.querySelector('#shopList button.act.sell');
    if(!b) return false; b.click(); return true;})()`);
  await api.sleep(120);
  const sellAfter = await api.ev(report);
  api.check('продажа: окно и продавец не пересоздаются',
    sold && stable(sellBefore, sellAfter) && sellAfter.gold !== sellBefore.gold,
    JSON.stringify({ sold, gold: [sellBefore.gold, sellAfter.gold] }));

  // Заявка на квест обновляет заказы в ратуше, не закрывая окно.
  await api.ev(`window.__mm6Debug.forceShop('hall'); true`);
  const questBefore = await api.ev(report);
  const accepted = await api.ev(`(()=>{const b=[...document.querySelectorAll('#shopList button.act')]
    .find(x=>/Принять/.test(x.textContent||'')); if(!b) return false; b.click(); return true;})()`);
  await api.sleep(120);
  const questAfter = await api.ev(report);
  const questText = await api.ev(`document.getElementById('shopList').textContent`);
  api.check('квест: заказы обновлены, окно остаётся открытым',
    accepted && stable(questBefore, questAfter) && /В работе|Сдать задание/.test(questText),
    JSON.stringify({ accepted, hasProgress: /В работе|Сдать задание/.test(questText) }));

  // Воскрешение обновляет церковное окно и не перезапускает сцену.
  await api.ev(`window.__mm6Debug.setPartyGold(5000); window.__mm6Debug.setHeroHp(0,0);
    window.__mm6Debug.forceShop('church'); true`);
  const reviveBefore = await api.ev(report);
  await api.ev(`window.__mm6Debug.resurrectAtChurch()`);
  await api.sleep(120);
  const reviveAfter = await api.ev(report);
  const hp = await api.ev(`window.__mm6State().party[0].hp`);
  api.check('оживление: окно живо, герой поднят, золото списано',
    stable(reviveBefore, reviveAfter) && hp > 0 && reviveAfter.gold !== reviveBefore.gold,
    JSON.stringify({ hp, gold: [reviveBefore.gold, reviveAfter.gold] }));

  // Явное закрытие — единственный способ убрать окно.
  await api.ev(`document.getElementById('shopClose').click()`);
  const closed = await api.ev(report);
  api.check('окно закрывается только явной командой игрока', !closed.open, JSON.stringify(closed));
  await api.ev(`window.__mm6Debug.forceShop('market'); true`);
  const reopened = await api.ev(report);
  api.check('после закрытия и повторного открытия сцена — тот же узел продавца',
    reopened.open && reopened.sellerMark === buyBefore.sellerMark && !!reopened.sellerRect,
    JSON.stringify(reopened));
});
