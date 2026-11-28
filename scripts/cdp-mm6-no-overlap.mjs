// Часть 3: сквозная проверка правила «НИ ОДНО окно, плашка, сообщение или
// подсказка не перекрывают другое окно» в реальных игровых состояниях.
// Запуск: node scripts/cdp-mm6-no-overlap.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('NO OVERLAP PART 3', async api => {
  await api.startGame();
  await api.sleep(220);

  const clean = async (name, extra) => {
    await api.ev(`window.__mm6Debug.showToast('Проверка: ${name}')`);
    await api.sleep(320); // даем opacity-переходу завершиться, иначе тост виртуально невидим
    const r = await api.ev('window.__mm6Debug.overlapReport()');
    api.check(name, r.overlaps.length === 0 && r.rects.length >= (r.modal ? 1 : 4),
      JSON.stringify({ rects: r.rects.map(x => x.name), overlaps: r.overlaps, extra }));
    return r;
  };

  const map = await clean('карта: окна,Dock-панели и сообщение не пересекаются');
  api.check('на карте есть окно состояния, мини-карта, полоса сообщения, панели управления и тост',
    ['stateWindow', 'minimap', 'messageStrip', 'leftDock', 'rightDock', 'toast'].every(n =>
      map.rects.some(r => r.name === n)), JSON.stringify(map.rects.map(r => r.name)));

  // Подсказка и предупреждение о врагах одновременно: раньше они наезжали друг на друга.
  await api.ev(`(()=>{const g=window.__mm6State(),m=g.world.maps[g.world.current],p=g.player;
    m.monsters.slice(0,3).forEach(e=>{e.x=p.x+1;e.y=p.y;e.alive=true;});
    return window.__mm6Debug.showMapHint('Дорога','Каменная дорога ведёт к ратуше и зданиям двора');})()`);
  await api.sleep(150);
  const hint = await api.ev('window.__mm6Debug.overlapReport()');
  api.check('подсказка не перекрывает предупреждение о врагах и полосу сообщения',
    !hint.overlaps.length && hint.rects.some(r => r.name === 'hint') &&
    hint.rects.some(r => r.name === 'enemyWarning'),
    JSON.stringify({ rects: hint.rects.map(r => r.name), overlaps: hint.overlaps }));

  await api.ev(`window.__mm6Debug.focusMapEnemy(0,true)`);
  await api.sleep(150);
  const plate = await api.ev('window.__mm6Debug.overlapReport()');
  api.check('плашка врага не пересекает окна и гасит подсказку',
    !plate.overlaps.length && plate.rects.some(r => r.name === 'enemyPlate0') &&
    !plate.rects.some(r => r.name === 'hint'),
    JSON.stringify({ rects: plate.rects.map(r => r.name), overlaps: plate.overlaps }));
  await api.ev('window.__mm6Debug.clearMapEnemy()');

  // Бой: панель врага, бейдж хода, окно лога, очередь, карточки, тост иDock-ы.
  await api.ev(`(()=>{const list=['Черт','Скелет','Зелёный Паук'].map(name=>({name,alive:true,hp:100,maxHp:100,
    atk:3,defVal:2,speed:3,def:{},gold:[0,0]})); window.__mm6Debug.startBattle(list); return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(150);
  const battle = await clean('бой: HUD, очередь, карточки, тост и панели управления не пересекаются');
  api.check('в бою видны панель врага, бейдж, лог, очередь и карточки',
    ['enemyPanel', 'turnBadge', 'logWindow', 'turnQueue', 'party'].every(n =>
      battle.rects.some(r => r.name === n)),
    JSON.stringify(battle.rects.map(r => r.name)));
  await api.ev('window.__mm6Debug.closeBattle()');
  await api.sleep(100);

  // Модальные окна: сообщение прячется, а само окно одно и не пересекается с HUD.
  const modal = async (name, open, close, expectedId) => {
    await api.ev(open);
    await api.sleep(120);
    const visible = await api.ev(`(()=>{const e=document.getElementById('${expectedId}');
      return !!e&&!e.classList.contains('hidden');})()`);
    const r = await clean(name + ': окно и сообщение не пересекаются');
    api.check(name + ': окно открыто, а тост под модальным окном скрыт',
      visible && r.modal === 1 && r.rects.some(x => x.name === 'modal') &&
      !r.rects.some(x => x.name === 'toast'),
      JSON.stringify({ visible, modal: r.modal, rects: r.rects.map(x => x.name) }));
    await api.ev(close);
    await api.sleep(80);
  };

  await modal('инвентарь', 'window.__mm6Debug.toggleInventory(true)',
    'window.__mm6Debug.toggleInventory(false)', 'inventory');
  await modal('лавка', 'window.__mm6Debug.forceShop("weapons")',
    'window.__mm6Debug.toggleShop(false)', 'shop');
  await modal('журнал заданий', 'document.getElementById("btnQuests").click()',
    'document.getElementById("questJournal").classList.add("hidden")', 'questJournal');
  await modal('журнал событий', 'document.getElementById("btnLog").click()',
    'document.getElementById("eventLog").classList.add("hidden")', 'eventLog');
  await modal('настройки', 'document.getElementById("btnSettings").click()',
    'document.getElementById("settings").classList.add("hidden")', 'settings');
});
