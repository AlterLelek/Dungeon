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
  api.check('панель врага компактная и не заходит на бейдж хода',
    hud.panel.w <= 224 && hud.panel.h <= 62 && hud.badge.x >= hud.panel.x + hud.panel.w - 2,
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
});
