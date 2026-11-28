// Часть 2: компактное окно состояния игры вместо большого окна героя,
// новые нижние карточки отряда, компактные панель врага и очередь.
// Запуск: node scripts/cdp-mm6-battle-hud-v2.mjs
import { runCdp } from './cdp-lib.mjs';

runCdp('BATTLE HUD PART 2', async api => {
  await api.startGame();
  await api.sleep(200);

  const state = await api.ev(`(()=>{const w=window.__mm6Debug.mapStateWindowReport(),g=window.__mm6State();
    return {w,turn:g.world.turn,gold:g.gold,hero:document.getElementById('heroName').value};})()`);
  api.check('вместо окна героя слева — окно состояния 214×56',
    !!state.w && state.w.panel.w === 214 && state.w.panel.h === 56 && state.w.panel.x === 10,
    JSON.stringify(state.w && state.w.panel));
  api.check('в окне состояния есть локация, ход, золото отряда и цель',
    !!state.w && !!state.w.place && /\d+\/\d+/.test(state.w.place) &&
    state.w.turn === state.turn && state.w.gold === state.gold &&
    !!state.w.objective && !state.w.place.includes(state.hero),
    JSON.stringify(state));

  await api.ev(`(()=>{const list=['Черт','Скелет','Зелёный Паук'].map(name=>({name,alive:true,hp:100,maxHp:100,
    atk:3,defVal:2,speed:3,def:{},gold:[0,0]}));
    window.__mm6Debug.startBattle(list);return true;})()`);
  await api.waitFor(`(()=>{const b=window.__mm6State()&&window.__mm6State().battle;
    return !!b&&b.turn==='hero'&&!b.busy;})()`, 8000);
  await api.sleep(200);

  const hud = await api.ev('window.__mm6Debug.battleHudReport()');
  const queue = await api.ev('window.__mm6Debug.turnQueueReport()');
  const queueWidth = await api.ev(`document.getElementById('turnQueue').getBoundingClientRect().width`);
  api.check('панель врага на 10% больше окна состояния и не заходит на бейдж хода',
    hud.panel.w >= 231 && hud.panel.w <= 239 && hud.panel.h >= 60 && hud.panel.h <= 64 &&
    hud.badge.x >= hud.panel.x + hud.panel.w - 2,
    JSON.stringify({ panel: hud.panel, badge: hud.badge }));
  api.check('очередь компактная, не более пяти строк и ниже панели врага',
    queue.visible && queue.rows.length <= 5 && !!queue.more &&
    queue.rows.every(r => !!r.name) && queueWidth <= 96,
    JSON.stringify({ rows: queue.rows.length, more: queue.more, width: queueWidth }));

  const cards = await api.ev(`(()=>[...document.querySelectorAll('#party.in-battle .pcard')].map(c=>{
    const r=c.getBoundingClientRect(), q=n=>c.querySelector(n);
    return {hero:c.dataset.hero,class:c.dataset.class,
      face:q('.pface')?{src:q('.pface').getAttribute('src'),w:+q('.pface').getBoundingClientRect().width.toFixed(1)}:null,
      badge:q('.pemoji')?q('.pemoji').textContent:null,name:q('.pname')?q('.pname').textContent:null,
      nums:q('.nums')?q('.nums').textContent:null,bars:c.querySelectorAll('.pbar').length,
      stats:q('.pstats')?[...q('.pstats').querySelectorAll('i')].map(i=>i.textContent):[],
      level:q('.plevel')?q('.plevel').textContent:null,
      h:+r.height.toFixed(1),bottom:+r.bottom.toFixed(1)};}))()`);
  api.check('три карточки: медальон, значок класса, имя, HP/MP и узкие полосы',
    cards.length === 3 && cards.every(c => c.face && /\/assets\/sprites\/portraits\//.test(c.face.src) &&
      c.face.w >= 20 && !!c.badge && !!c.name && /^\d+\/\d+\d+\/\d+$/.test(c.nums.replace(/\s/g,'')) &&
      c.bars === 2 && !!c.class),
    JSON.stringify(cards.map(c => ({ hero: c.hero, face: c.face, badge: c.badge, bars: c.bars, class: c.class }))));
  api.check('в карточке статы значками и строка «Ур N · до следующего: M»',
    cards.every(c => c.stats.length === 4 && c.stats[0].startsWith('⚔') && c.stats[1].startsWith('🛡') &&
      c.stats[2].startsWith('✨') && c.stats[3].startsWith('⚡') &&
      /^Ур \d+ · до следующего: \d+$/.test(c.level || '')),
    JSON.stringify(cards.map(c => ({ stats: c.stats, level: c.level }))));
  api.check('карточки остаются компактными и прижаты к низу',
    cards.every(c => c.h >= 64 && c.h <= 76 && Math.abs(c.bottom - hud.party[0].bottom) <= 1),
    JSON.stringify(cards.map(c => ({ h: c.h, bottom: c.bottom }))));

  const statuses = await api.ev(`window.__mm6Debug.portraitReport().cards.map(c=>c.status)`);
  api.check('строка состояния содержит только состояние, без имени и класса',
    statuses.length === 3 && statuses.every(s => /^(Хорошее|Ранен|Тяжёло|Без сознания)$/.test(s || '')),
    JSON.stringify(statuses));
  api.check('полные имена и значки статов не обрезаются в карточках',
    hud.party.length === 3 && hud.party.every(c => !!c.name && c.name.length >= 3 &&
      !c.name.includes('…') && !c.nameClipped && !c.statsClipped),
    JSON.stringify(hud.party.map(c => ({ name: c.name, nameClipped: c.nameClipped, statsClipped: c.statsClipped,
      cardW: c.w, nameW: c.nameW, nameScroll: c.nameScroll, topW: c.topW, numsW: c.numsW }))));

  // Панель врага рисуется на canvas, очередь — DOM. Проверяем ихgeometry
  // на нескольких окон, где масштаб canvas различается.
  const geometry = () => api.ev(`(()=>{
    const p=window.__mm6Debug.battleHudReport().panel, r=document.getElementById('cv').getBoundingClientRect();
    const scale=Math.min(r.width/640,r.height/360);
    const panel={x:r.left+(r.width-640*scale)/2+p.x*scale,y:r.top+(r.height-360*scale)/2+p.y*scale,
      w:p.w*scale,h:p.h*scale};
    const q=document.getElementById('turnQueue').getBoundingClientRect();
    const queue={x:q.left,y:q.top,w:q.width,h:q.height};
    const ox=Math.min(panel.x+panel.w,queue.x+queue.w)-Math.max(panel.x,queue.x);
    const oy=Math.min(panel.y+panel.h,queue.y+queue.h)-Math.max(panel.y,queue.y);
    return {panel,queue,overlap:(ox>1&&oy>1)?{w:ox,h:oy}:null};})()`);
  for (const [vw, vh] of [[800, 600], [1280, 720], [1024, 768]]) {
    await api.viewport(vw, vh); await api.sleep(120);
    const g = await geometry();
    api.check('очередь не перекрывает панель врага при '+vw+'×'+vh,
      !g.overlap && g.queue.y >= g.panel.y + g.panel.h - 1,
      JSON.stringify(g));
  }
});
