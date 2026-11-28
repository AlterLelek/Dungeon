// Часть 7: крупные полупрозрачные кнопки управления доступны на ПК и на тач-экране.
// Кнопки реально двигают, поворачивают, открывают инвентарь/меню и бьют в бою;
// H/Р и настройка скрывают их только на ПК. Пересечения с HUD запрещены.
// Запуск: node scripts/cdp-mm6-touch-controls.mjs
import { runCdp } from './cdp-lib.mjs';

const center = (api, selector) => api.ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});
  if(!e||!e.getClientRects().length) return null;
  const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);

async function press(api, selector) {
  const p = await center(api, selector);
  if (!p) throw new Error('кнопка не найдена: ' + selector);
  await api.click(p.x, p.y);
  await api.sleep(70);
}

const player = api => api.ev(`(()=>{const g=window.__mm6State(),p=g.player;
  return {x:p.x,y:p.y,dir:p.dir,turn:g.world.turn,battle:!!g.battle};})()`);

runCdp('TOUCH CONTROLS PART 7', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0])`);
  await api.waitFor('!!window.__mm6State() && window.__mm6State().world.count>0', 8000);
  await api.viewport(1280, 720);
  await api.sleep(260);

  const pc = await api.ev('window.__mm6Debug.controlsReport()');
  const ids = ['btnAttack', 'btnSpell', 'btnFlee', 'btnInv', 'btnShop', 'btnQuests',
    'btnInteract', 'btnSettings', 'btnLog', 'turnLeft', 'turnRight'];
  api.check('крупные кнопки видны на ПК и не скрыты настройкой',
    pc.visible && pc.setting && !pc.hiddenClass && pc.display !== 'none' &&
    ids.every(id => pc.buttons[id] && pc.buttons[id].visible),
    JSON.stringify({visible:pc.visible,setting:pc.setting,display:pc.display,
      missing:ids.filter(id => !pc.buttons[id] || !pc.buttons[id].visible)}));
  const largeIds = ids.filter(id => id !== 'btnLog');
  api.check('кнопки движения, поворота и действий достаточно крупные',
    pc.dpad.w >= 150 && pc.turnPair.w >= 100 && pc.rightDock.w >= 110 &&
    ['up', 'down', 'left', 'right'].every(k => pc.buttons['move-' + k]?.rect.w >= 48) &&
    largeIds.every(id => pc.buttons[id].rect.w >= 44 && pc.buttons[id].rect.h >= 44) &&
    pc.buttons.btnLog.rect.h >= 28,
    JSON.stringify({dpad:pc.dpad,turn:pc.turnPair,right:pc.rightDock,
      up:pc.buttons['move-up']?.rect,attack:pc.buttons.btnAttack?.rect}));
  api.check('кнопки полупрозрачные, фон не закрывает сцену',
    ['move-up', 'btnAttack', 'btnInv', 'btnSettings'].every(k =>
      pc.buttons[k].alpha >= 0.2 && pc.buttons[k].alpha <= 0.7),
    JSON.stringify(Object.fromEntries(['move-up', 'btnAttack', 'btnInv', 'btnSettings']
      .map(k => [k, pc.buttons[k]?.background]))));
  api.check('кнопки не перекрывают окна, плашки и сообщения на ПК',
    pc.overlaps.length === 0, JSON.stringify(pc.overlaps));

  const layouts = [[800, 600], [1280, 720], [1024, 768], [640, 900]];
  for (const [w, h] of layouts) {
    await api.viewport(w, h);
    await api.sleep(180);
    const view = await api.ev('window.__mm6Debug.controlsReport()');
    api.check(`кнопки видны и не пересекают HUD при ${w}×${h} на карте`,
      view.visible && ids.every(id => view.buttons[id] && view.buttons[id].visible) &&
      view.overlaps.length === 0,
      JSON.stringify({visible:view.visible,display:view.display,
        missing:ids.filter(id => !view.buttons[id] || !view.buttons[id].visible),
        overlaps:view.overlaps}));
  }
  await api.viewport(1280, 720);
  await api.sleep(160);

  const beforeMove = await player(api);
  let moved = null;
  for (const dir of ['up', 'down', 'left', 'right']) {
    await press(api, `[data-move="${dir}"]`);
    const now = await player(api);
    if (now.battle) { await api.ev('window.__mm6Debug.closeBattle()'); continue; }
    if (now.x !== beforeMove.x || now.y !== beforeMove.y) { moved = { dir, before: beforeMove, now }; break; }
  }
  api.check('кнопки движения реально перемещают героя и двигают ход',
    !!moved && moved.now.turn >= moved.before.turn, JSON.stringify(moved));

  const beforeTurn = await player(api);
  await press(api, '#turnLeft');
  const afterTurn = await player(api);
  api.check('кнопка поворота меняет направление героя',
    afterTurn.dir === (beforeTurn.dir + 3) % 4,
    JSON.stringify({before:beforeTurn.dir,after:afterTurn.dir}));

  await press(api, '#btnInv');
  const inv = await api.ev(`({open:!!window.__mm6State().invOpen,
    visible:!document.getElementById('inventory').classList.contains('hidden')})`);
  api.check('кнопка инвентаря открывает окно', inv.open && inv.visible, JSON.stringify(inv));
  await api.ev(`document.getElementById('invClose').click()`);

  await press(api, '#btnSettings');
  const menu = await api.ev(`({open:!!window.__mm6State().settingsOpen,
    visible:!document.getElementById('settings').classList.contains('hidden')})`);
  api.check('кнопка меню открывает настройки', menu.open && menu.visible, JSON.stringify(menu));
  await api.ev(`document.getElementById('settingsClose').click()`);

  await api.ev(`(()=>{const d=window.__mm6Debug; d.setDebugRng(0.5);
    d.startBattle(['Черт','Скелет','Зелёный Паук'].map(name=>({name,alive:true,hp:1000,maxHp:1000,
      atk:1,defVal:1,speed:1,def:{},gold:[0,0]}))); return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  const enemyPoint = await api.ev(`(()=>{const q=window.__mm6Debug.battleEnemyCanvasPoint(0),
    r=document.getElementById('cv').getBoundingClientRect();
    return {x:r.left+q.x*r.width/640,y:r.top+q.y*r.height/360};})()`);
  await api.click(enemyPoint.x, enemyPoint.y);
  await api.sleep(70);
  const targetIdx = await api.ev('window.__mm6State().battle.targetIdx');
  api.check('цель выбирается кликом по врагу перед ударом кнопкой', targetIdx >= 0,
    JSON.stringify({targetIdx,enemyPoint}));
  const beforeHit = await api.ev(`(()=>{const b=window.__mm6State().battle;
    return {log:b.log.length,busy:b.busy,hp:b.enemies.map(e=>e.hp)};})()`);
  await press(api, '#btnAttack');
  const afterHit = await api.ev(`(()=>{const b=window.__mm6State().battle;
    return {log:b.log.length,busy:b.busy,hp:b.enemies.map(e=>e.hp)};})()`);
  api.check('кнопка атаки наносит удар и пишет в журнал боя',
    afterHit.log > beforeHit.log && afterHit.busy !== false &&
    afterHit.hp.some((hp, i) => hp < beforeHit.hp[i]),
    JSON.stringify({before:beforeHit,after:afterHit}));
  for (const [w, h] of layouts) {
    await api.viewport(w, h);
    await api.sleep(180);
    const battleView = await api.ev('window.__mm6Debug.controlsReport()');
    api.check(`кнопки видны и не пересекают HUD при ${w}×${h} в бою`,
      battleView.visible && ids.every(id => battleView.buttons[id] && battleView.buttons[id].visible) &&
      battleView.overlaps.length === 0,
      JSON.stringify({visible:battleView.visible,display:battleView.display,
        missing:ids.filter(id => !battleView.buttons[id] || !battleView.buttons[id].visible),
        overlaps:battleView.overlaps}));
  }
  await api.viewport(1280, 720);
  await api.sleep(160);
  await api.ev('window.__mm6Debug.closeBattle()');

  await api.key('h');
  const hidden = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('клавиша H скрывает кнопки и сохраняет выбор в настройке',
    hidden.visible === false && hidden.setting === false && hidden.hiddenClass === true &&
    hidden.display === 'none', JSON.stringify({visible:hidden.visible,
      setting:hidden.setting,display:hidden.display}));
  await api.key('h');
  const shown = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('повторное нажатие H возвращает кнопки',
    shown.visible && shown.setting && !shown.hiddenClass, JSON.stringify({visible:shown.visible}));

  await api.ev('window.__mm6Debug.setSettings({showControls:false})');
  await api.sleep(60);
  const off = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('настройка скрывает кнопки на ПК',
    off.visible === false && off.setting === false && off.hiddenClass === true,
    JSON.stringify({visible:off.visible,setting:off.setting}));

  await api.touchViewport(390, 844);
  await api.sleep(200);
  const portrait = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('на тач-экране в портрете кнопки остаются видимыми при скрытой настройке',
    portrait.touch && portrait.visible && portrait.hiddenClass && portrait.display === 'flex' &&
    ids.every(id => portrait.buttons[id] && portrait.buttons[id].visible) &&
    portrait.overlaps.length === 0,
    JSON.stringify({touch:portrait.touch,visible:portrait.visible,display:portrait.display,
      overlaps:portrait.overlaps}));

  await api.touchViewport(844, 390);
  await api.sleep(200);
  const landscape = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('на тач-экране в ландшафте кнопки тоже всегда на месте',
    landscape.touch && landscape.visible && landscape.hiddenClass &&
    landscape.display === 'block' && landscape.overlaps.length === 0,
    JSON.stringify({touch:landscape.touch,visible:landscape.visible,
      display:landscape.display,overlaps:landscape.overlaps}));

  await api.ev('window.__mm6Debug.setSettings({showControls:true})');
  await api.viewport(1280, 720);
  await api.sleep(160);
  const restored = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('после возврата настройки кнопки снова видны на ПК',
    restored.visible && restored.setting && !restored.hiddenClass &&
    restored.overlaps.length === 0, JSON.stringify({visible:restored.visible,
      overlaps:restored.overlaps}));
});
