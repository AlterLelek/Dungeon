// games/labyrinth/game.js
import { settings, wasdAllowed, arrowsAllowed, letterOk } from '../../shared/settings.js';
import { playSound, startAmbient, stopAmbient, ensureAmbient } from '../../shared/audio.js';
import { genMaze, genRooms, genOpen, bfsStep } from './maps.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const dist = (a, b, c, d) => Math.abs(a - c) + Math.abs(b - d);
const lerp = (a, b, t) => a + (b - a) * t;

let G = null, curHero = 'warrior', curMode = 'classic', curField = 'maze';
let keys = {}, runHeld = false;
const cv = $('cv'), ctx = cv.getContext('2d');
let COLS = 25, ROWS = 15, TS = 34, OFFX = 0, OFFY = 0;

const MON = {
  spider:{name:'Паук',emoji:'🕷️',color:'#c060e0',slow:1},
  ghost:{name:'Призрак',emoji:'👻',color:'#9fd0ff',slow:1},
  skeleton:{name:'Скелет',emoji:'💀',color:'#d8d8c0',slow:1},
  necro:{name:'Некромант',emoji:'🧙',color:'#b070ff',slow:1},
  zombie:{name:'Зомби',emoji:'🧟',color:'#7ce07c',slow:3},
  turtle:{name:'Черепаха',emoji:'🐢',color:'#5fd0a0',slow:3},
  mouse:{name:'Мышь',emoji:'🐭',color:'#e0a870',slow:1}
};

const HEROES = {
  warrior:{name:'Воин',emoji:'🛡️',color:'#f09040',hp:85,atk:8,def:3,speed:150,mana:40,desc:'Крепкий боец.',spells:[{k:'Z',icon:'⚔️',name:'Удар клинка',cost:6},{k:'X',icon:'🔥',name:'Ярость',cost:10},{k:'C',icon:'🗿',name:'Стража',cost:14}]},
  mage:{name:'Маг',emoji:'🧙',color:'#5090ff',hp:60,atk:6,def:1,speed:165,mana:60,desc:'Дальнобойный.',spells:[{k:'Z',icon:'☄️',name:'Файрбол',cost:8},{k:'X',icon:'🔵',name:'Щит',cost:10},{k:'C',icon:'😈',name:'Чертёнок',cost:14}]},
  paladin:{name:'Паладин',emoji:'✝️',color:'#ffd860',hp:95,atk:7,def:4,speed:170,mana:50,desc:'Живучий танк.',spells:[{k:'Z',icon:'🌟',name:'Волна света',cost:9},{k:'X',icon:'💚',name:'Лечение',cost:12},{k:'C',icon:'🗿',name:'Стража',cost:14}]},
  devil:{name:'Черт',emoji:'😈',color:'#e05050',hp:70,atk:9,def:2,speed:130,mana:55,desc:'Быстрый вампир.',spells:[{k:'Z',icon:'💥',name:'Адский пламень',cost:10},{k:'X',icon:'🩸',name:'Ритуал',cost:8},{k:'C',icon:'🧟',name:'Нежить',cost:12}]}
};

function resize() {
  const w = $('stage').clientWidth - 4, h = $('stage').clientHeight - 4; cv.width = w; cv.height = h;
  TS = Math.floor(Math.min(w / COLS, h / ROWS)); OFFX = Math.floor((w - TS * COLS) / 2); OFFY = Math.floor((h - TS * ROWS) / 2);
  if ('ontouchstart' in window) $('dpad').style.display = 'grid';
}
window.addEventListener('resize', resize);

function makeMonster(type, x, y, weak) {
  const c = settings.monsters[type] || {hp:20,atk:5,def:0,steps:1,radius:6,taste:'hero'}, k = weak ? 0.55 : 1;
  return {type, x, y, hp:Math.max(1,Math.round(c.hp*k*(1+(G.lvl-1)*0.12))), maxHp:Math.round(c.hp*k*(1+(G.lvl-1)*0.12)), atk:Math.max(1,Math.round(c.atk*k*(1+(G.lvl-1)*0.1))), def:c.def, steps:c.steps, radius:c.radius, taste:c.taste, slow:MON[type].slow||1, cnt:0, splitted:!!weak, flash:0, spawnT:0, dying:0, animOff:Math.random()*6.28};
}

function nextLevel(first) {
  let grid = curField==='maze'?genMaze(COLS,ROWS):curField==='rooms'?genRooms(COLS,ROWS):genOpen(COLS,ROWS);
  G.grid = grid; const free = []; for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(!grid[y][x])free.push([x,y]);
  const H = HEROES[curHero];
  Object.assign(G.hero, {x:free[0][0], y:free[0][1], hp:first?H.hp:Math.min(G.hero.maxHp, G.hero.hp+Math.round(G.hero.maxHp*0.25)), mana:first?H.mana:G.hero.maxMana, shield:0, rage:0});
  G.monsters = []; G.allies = []; G.corpses = []; G.projs = []; G.parts = []; G.rings = []; G.texts = []; G.gemList = []; G.items = [];
  G.gemsNeed = curMode==='treasure'?irand(8,12):irand(12,16);
  for(let i=0;i<G.gemsNeed;i++) G.gemList.push({x:free[i+2][0],y:free[i+2][1],t:Math.random()*6.28});
  const mTypes = ['spider','ghost','skeleton','mouse','turtle','necro'];
  for(let i=0;i<Math.min(4+G.lvl,10);i++) { const c=pick(free); G.monsters.push(makeMonster(pick(mTypes),c[0],c[1])); }
  resize(); updateHUD();
}

function tryMove(dx, dy) {
  const h = G.hero; if (h.moveT > 0) return; h.face = [dx, dy]; const nx = h.x + dx, ny = h.y + dy;
  if (nx<0||ny<0||nx>=COLS||ny>=ROWS||G.grid[ny][nx]) return; h.x = nx; h.y = ny; h.moveT = (h.boots>0||runHeld)?0.08:0.14;
  playSound('step');
  const gi = G.gemList.findIndex(g => g.x===h.x && g.y===h.y); if(gi>=0){G.gemList.splice(gi,1); G.gems++; G.score+=10; playSound('collect');}
  if(G.gems>=G.gemsNeed && curMode!=='survival') { G.lvl++; nextLevel(false); } updateHUD();
}

function heroAttack() {
  const h = G.hero, [dx, dy] = h.face, tx = h.x + dx, ty = h.y + dy; let hit = false;
  for(let m of G.monsters) { if(m.x===tx && m.y===ty && !m.dying) { hit = true; m.hp -= Math.max(1, h.atk - m.def); if(m.hp<=0) m.dying=0.01; playSound('hit'); } }
  if(!hit) playSound('skip');
}

function updateHUD() {
  if(!G) return; const h = G.hero;
  $('heroChip').innerHTML = `${HEROES[curHero].emoji} <b>${h.name}</b>`;
  $('hpTxt').textContent = `${h.hp}/${h.maxHp}`; $('scoreTxt').textContent = G.score;
  $('gemTxt').textContent = `${G.gems}/${G.gemsNeed}`; $('lvlTxt').textContent = G.lvl;
  $('timeChip').textContent = `⏱ ${Math.floor(G.time)} c`;
}

function loop(t) {
  requestAnimationFrame(loop); if(!G || !G.running || G.paused) return;
  const d = 0.016; G.time += d; G.hero.moveT = Math.max(0, G.hero.moveT - d);
  ctx.fillStyle = '#0c0c14'; ctx.fillRect(0,0,cv.width,cv.height);
  const pal = {floor:'#2a2620', wall:'#4a4238', wallTop:'#5c5346'};
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++) {
    ctx.fillStyle = G.grid[y][x] ? pal.wall : pal.floor; ctx.fillRect(OFFX+x*TS, OFFY+y*TS, TS, TS);
  }
  G.gemList.forEach(g => { ctx.font=`${TS*0.5}px serif`; ctx.fillText('💎', OFFX+g.x*TS+TS/4, OFFY+g.y*TS+TS*0.7); });
  G.monsters.forEach(m => { if(!m.dying) { ctx.font=`${TS*0.7}px serif`; ctx.fillText(MON[m.type].emoji, OFFX+m.x*TS+TS/4, OFFY+m.y*TS+TS*0.7); } });
  ctx.font=`${TS*0.7}px serif`; ctx.fillText(HEROES[curHero].emoji, OFFX+h.x*TS+TS/4, OFFY+h.y*TS+TS*0.7);
}

$('startBtn2').onclick = () => {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show'));
  G = {lvl:1, score:0, gems:0, gemsNeed:0, running:true, paused:false, time:0, hero:{name:$('nameInp').value, px:0, py:0, moveT:0, face:[1,0], maxHp:100, hp:100, atk:10, def:2, mana:50, maxMana:100, shield:0, rage:0, boots:0}};
  nextLevel(true); startAmbient(); requestAnimationFrame(loop);
};

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if(k===' ') heroAttack();
  if(k==='w' || e.key==='ArrowUp') tryMove(0,-1); if(k==='s' || e.key==='ArrowDown') tryMove(0,1);
  if(k==='a' || e.key==='ArrowLeft') tryMove(-1,0); if(k==='d' || e.key==='ArrowRight') tryMove(1,0);
});

resize(); $('menuOv').classList.add('show');
