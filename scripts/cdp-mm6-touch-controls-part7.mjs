// Часть 7 [ГОБОРЕНО]: крупные полупрозрачные кнопки работают настоящим тапом
// на мобильном экране, остаются видны при скрытой настройке и не наезжают на HUD.
// Запуск: node scripts/cdp-mm6-touch-controls-part7.mjs
import { runCdp } from './cdp-lib.mjs';

const center = (api, selector) => api.ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});
  if(!e||!e.getClientRects().length) return null;
  const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,
    w:+r.width.toFixed(1),h:+r.height.toFixed(1)};})()`);
const player = api => api.ev(`(()=>{const g=window.__mm6State(),p=g.player;
  return {x:p.x,y:p.y,dir:p.dir,turn:g.world.turn};})()`);

runCdp('TOUCH CONTROLS PART 7', async api => {
  await api.startGame();
  await api.ev(`Math.random=()=>0.5; window.__mm6Debug.startGame('normal',[0])`);
  await api.waitFor('!!window.__mm6State() && window.__mm6State().world.count>0', 8000);
  await api.ev(`window.__mm6Debug.setSettings({showControls:false});true`);
  await api.touchViewport(390, 844);
  await api.sleep(260);

  const portrait = await api.ev('window.__mm6Debug.controlsReport()');
  const ids = ['move-up','move-down','move-left','move-right','turnLeft','turnRight',
    'btnAttack','btnSpell','btnInv','btnShop','btnLog','btnSettings'];
  api.check('скрытые на ПК кнопки остаются крупными и видимыми на тач-экране',
    portrait.touch && !portrait.setting && portrait.hiddenClass && portrait.visible &&
    ids.every(id => portrait.buttons[id] && portrait.buttons[id].visible) &&
    ['move-up','turnLeft','btnAttack','btnInv'].every(id =>
      portrait.buttons[id].rect.w >= 44 && portrait.buttons[id].rect.h >= 44) &&
    ['move-up','btnAttack','btnInv'].every(id =>
      portrait.buttons[id].alpha >= 0.2 && portrait.buttons[id].alpha <= 0.7),
    JSON.stringify({ touch: portrait.touch, visible: portrait.visible, setting: portrait.setting,
      up: portrait.buttons['move-up'], attack: portrait.buttons.btnAttack,
      inv: portrait.buttons.btnInv }));
  api.check('на тач-экране кнопки не перекрывают HUD',
    portrait.overlaps.length === 0, JSON.stringify(portrait.overlaps));

  const beforeTurn = await player(api);
  const turn = await center(api, '#turnLeft');
  await api.tap(turn.x, turn.y);
  await api.sleep(90);
  const afterTurn = await player(api);
  api.check('тап по кнопке поворота меняет направление',
    afterTurn.dir === (beforeTurn.dir + 3) % 4,
    JSON.stringify({ before: beforeTurn.dir, after: afterTurn.dir, turn }));

  const beforeMove = await player(api);
  let moved = null;
  for (const dir of ['up', 'down', 'left', 'right']) {
    const p = await center(api, `[data-move="${dir}"]`);
    await api.tap(p.x, p.y);
    await api.sleep(110);
    const now = await player(api);
    if (now.x !== beforeMove.x || now.y !== beforeMove.y) { moved = { dir, before: beforeMove, now }; break; }
  }
  api.check('тап по D-pad реально двигает героя и двигает ход',
    !!moved && moved.now.turn >= moved.before.turn, JSON.stringify(moved));

  const inv = await center(api, '#btnInv');
  await api.tap(inv.x, inv.y);
  await api.sleep(90);
  api.check('тап открывает инвентарь',
    await api.ev(`!!window.__mm6State().invOpen &&
      !document.getElementById('inventory').classList.contains('hidden')`));
  await api.ev(`document.getElementById('invClose').click()`);

  await api.ev(`(()=>{const d=window.__mm6Debug; d.setDebugRng(0.5);
    d.startBattle(['Черт','Скелет','Зелёный Паук'].map(name=>({name,alive:true,hp:1000,maxHp:1000,
      atk:1,defVal:1,speed:1,def:{},gold:[0,0]}))); return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  const battle = await api.ev('window.__mm6Debug.controlsReport()');
  api.check('в бою на тач-экране кнопки тоже видны и не наезжают на HUD',
    battle.visible && battle.touch && battle.overlaps.length === 0,
    JSON.stringify({ visible: battle.visible, overlaps: battle.overlaps }));

  const enemy = await api.ev(`(()=>{const q=window.__mm6Debug.battleEnemyCanvasPoint(0),
    r=document.getElementById('cv').getBoundingClientRect();
    return {x:r.left+q.x*r.width/640,y:r.top+q.y*r.height/360};})()`);
  await api.tap(enemy.x, enemy.y);
  await api.sleep(80);
  const beforeHit = await api.ev(`(()=>{const b=window.__mm6State().battle;
    return {log:b.log.length,hp:b.enemies.map(e=>e.hp),target:b.targetIdx};})()`);
  const attack = await center(api, '#btnAttack');
  await api.tap(attack.x, attack.y);
  await api.sleep(120);
  const afterHit = await api.ev(`(()=>{const b=window.__mm6State().battle;
    return {log:b.log.length,hp:b.enemies.map(e=>e.hp),busy:b.busy};})()`);
  api.check('тап по врагу и кнопке атаки наносит удар',
    beforeHit.target >= 0 && afterHit.log > beforeHit.log &&
    afterHit.hp.some((hp, i) => hp < beforeHit.hp[i]),
    JSON.stringify({ before: beforeHit, after: afterHit }));

  await api.ev(`window.__mm6Debug.closeBattle();
    window.__mm6Debug.setSettings({showControls:true});true`);
  await api.viewport(1280, 720);
});
