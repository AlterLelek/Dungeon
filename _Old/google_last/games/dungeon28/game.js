// games/dungeon28/game.js
import { settings } from '../../shared/settings.js';
import { playSound, startAmbient } from '../../shared/audio.js';
import { startBattleCutscene } from './cutscenes.js';

const $ = id => document.getElementById(id);
let gold = 0, hp = 100, floor = 1, active = false, hIdx = 0;
let monsters = [], player = {x:32, y:160}, stairs = {x:128, y:128, active:false};

const HEROES = [{name:"Воин", emoji:"🦸", maxHp:100},{name:"Маг", emoji:"🧙", maxHp:80}];
const WPNS = [{name:"Кулаки", dmg:1},{name:"Меч", dmg:5},{name:"Топор", dmg:10}];

function initFloor() {
  monsters = []; stairs.active = false; player.x = 32; player.y = 160;
  for (let i = 0; i < 5; i++) {
    monsters.push({
      x: Math.floor(Math.random()*10)*32, 
      y: Math.floor(Math.random()*10)*32, 
      hp: 60, maxHp: 60, atk: 4, def: 0, type: "💀"
    });
  }
  upd(); draw();
}

function fight(m, idx) {
  let dmg = Math.max(1, WPNS[0].dmg - m.def);
  let killed = (m.hp - dmg) <= 0;
  let counter = !killed ? Math.max(0, m.atk) : 0;

  startBattleCutscene({
    hero: HEROES[hIdx].name, heroHp: hp, heroMax: HEROES[hIdx].maxHp, counterDamage: counter,
    enemies: [{ name: m.type, type: 'ground', hp: m.hp, max: m.maxHp, damage: dmg, killed: killed }],
    onEnd: () => {
      m.hp -= dmg;
      if (m.hp <= 0) { monsters.splice(idx, 1); gold += 2; } 
      else if (counter > 0) hp -= counter;
      if (hp <= 0) { active = false; alert("Поражение!"); location.reload(); }
      if (!monsters.length) stairs.active = true;
      upd(); draw();
    }
  });
}

function move(dx, dy) {
  if (!active) return; 
  let nx = player.x + dx, ny = player.y + dy;
  if (nx < 0 || nx >= 320 || ny < 0 || ny >= 320) return; 
  player.x = nx; player.y = ny; playSound('step');
  let idx = monsters.findIndex(m => m.x === player.x && m.y === player.y);
  if (idx !== -1) fight(monsters[idx], idx);
  if (stairs.active && player.x === stairs.x && player.y === stairs.y) { floor++; initFloor(); }
  upd(); draw();
}

function upd() { 
  $('hp').innerText = hp; 
  $('score').innerText = gold; 
  $('floor-hud').innerText = floor; 
  $('e-count').innerText = monsters.length; 
}

function draw() {
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d'); 
  ctx.fillStyle = "#241f1d"; ctx.fillRect(0,0,320,320);
  ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (stairs.active) ctx.fillText("▼", stairs.x + 16, stairs.y + 17);
  monsters.forEach(m => ctx.fillText(m.type, m.x + 16, m.y + 17));
  ctx.fillText(HEROES[hIdx].emoji, player.x + 16, player.y + 17);
}

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'w') move(0, -32); 
  if (e.key === 'ArrowDown' || e.key === 's') move(0, 32);
  if (e.key === 'ArrowLeft' || e.key === 'a') move(-32, 0); 
  if (e.key === 'ArrowRight' || e.key === 'd') move(32, 0);
});

$('mode-0').onclick = () => { 
  $('start-screen').style.display = 'none'; 
  active = true; initFloor(); startAmbient(); 
};
