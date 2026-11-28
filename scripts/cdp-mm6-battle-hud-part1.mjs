// Часть 1 [ГОБОРЕНО]: компактный HUD боя без дублей имени и наложений.
// Запуск: node scripts/cdp-mm6-battle-hud-part1.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('BATTLE HUD PART 1', async api => {
  await api.startGame();
  await api.sleep(150);
  await api.ev(`(()=>{const list=['Солдат Мыши','Волшебница Мыши','Король Мыши'].map(name=>({
    name,alive:true,hp:43,maxHp:43,atk:5,defVal:2,speed:3,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list); return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(150);

  const hud = await api.ev('window.__mm6Debug.battleHudReport()');
  const stateWindow = await api.ev('window.__mm6Debug.mapStateWindowReport()');
  const queue = await api.ev('window.__mm6Debug.turnQueueReport()');
  const queueBox = await api.ev(`(()=>{const r=document.getElementById('turnQueue').getBoundingClientRect();
    return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};})()`);
  api.check('панель врага равна окну статов +10% и показывает имя, полосу HP и статы одной строкой',
    hud.panel.w >= Math.round(stateWindow.panel.w * 1.09) &&
    hud.panel.w <= Math.ceil(stateWindow.panel.w * 1.11) &&
    hud.panel.h >= Math.round(stateWindow.panel.h * 1.09) &&
    hud.panel.h <= Math.ceil(stateWindow.panel.h * 1.11) &&
    !hud.nameHp.overlap && /Солдат Мыши/.test(hud.label),
    JSON.stringify({ panel: hud.panel, state: stateWindow.panel, label: hud.label, nameHp: hud.nameHp }));
  api.check('очередь — компактный вертикальный список до пяти строк',
    queue.visible && queue.rows.length <= 5 && queue.rows.every(r => !!r.name) &&
    queueBox.w <= 96 && queue.rows.every((r, i) => !i || r.y >= queue.rows[i - 1].y),
    JSON.stringify({ rows: queue.rows.length, w: queueBox.w, y: queue.rows.map(r => r.y) }));

  const cards = await api.ev(`(()=>[...document.querySelectorAll('#party.in-battle .pcard')].map(c=>{
    const kids=[...c.children].map(n=>n.className);
    const n=q=>c.querySelector(q);
    return {name:n('.pname')&&n('.pname').textContent,
      status:n('.pstatus')&&n('.pstatus').textContent,
      nums:n('.nums')&&n('.nums').textContent,
      bars:c.querySelectorAll('.pbar').length,
      stats:n('.pstats')?[...n('.pstats').querySelectorAll('i')].map(i=>i.textContent):[],
      level:n('.plevel')&&n('.plevel').textContent,
      numsBeforeBars:kids.indexOf('nums')>=0 && kids.some(k=>k.startsWith('pbar')) &&
        kids.indexOf('nums')<kids.findIndex(k=>k.startsWith('pbar')),
      h:+c.getBoundingClientRect().height.toFixed(1)};}))()`);
  api.check('в строке состояния только состояние — имени и класса нет',
    cards.length === 3 && cards.every(c => /^(Хорошее|Ранен|Тяжёло|Без сознания)$/.test(c.status || '') &&
      !String(c.status).includes(c.name) && !/Воин|Маг|Паладин|Рыцарь/.test(c.status || '')),
    JSON.stringify(cards.map(c => ({ name: c.name, status: c.status }))));
  api.check('карточка: полное имя, HP/MP над узкими полосами, статы значками, уровень',
    cards.every(c => !!c.name && c.name.length >= 3 && c.numsBeforeBars && c.bars === 2 &&
      c.stats.length === 4 && c.stats.every(s => /^[⚔🛡✨⚡]/.test(s)) &&
      /^Ур \d+ · до следующего: \d+$/.test(c.level || '')),
    JSON.stringify(cards));
  api.check('статы не разъезжаются на строки: карточки остаются компактными',
    cards.every(c => c.h >= 64 && c.h <= 76), JSON.stringify(cards.map(c => c.h)));

  // Панель врага, бейдж хода и очередь измеряем в одних координатах DOM.
  const overlap = await api.ev(`(()=>{
    const p=window.__mm6Debug.battleHudReport(), r=document.getElementById('cv').getBoundingClientRect();
    const scale=Math.min(r.width/640,r.height/360);
    const toDom=x=>({x:r.left+(r.width-640*scale)/2+x.x*scale,
      y:r.top+(r.height-360*scale)/2+x.y*scale,w:x.w*scale,h:x.h*scale});
    const panel=toDom(p.panel), badge=toDom(p.badge);
    const q=document.getElementById('turnQueue').getBoundingClientRect();
    const queue={x:q.left,y:q.top,w:q.width,h:q.height};
    const hit=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&
      Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
    return {panel,badge,queue,badgePanel:hit(badge,panel),queuePanel:hit(queue,panel),queueBadge:hit(queue,badge)};})()`);
  api.check('панель врага не наезжает на очередь и кнопку «ХОД ОТРЯДА»',
    !overlap.badgePanel && !overlap.queuePanel && !overlap.queueBadge && queueBox.y >= overlap.panel.y + overlap.panel.h - 1,
    JSON.stringify(overlap));
});
