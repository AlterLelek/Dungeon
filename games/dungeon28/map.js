// games/dungeon28/map.js
import { GRID, CELL, ENEMY_TYPES, ENEMY_BASE, ITEM_TYPES } from './config.js';
import { state, randomInt } from './state.js';

let bgCanvas = null;

// Генерация фона пещеры (чтобы не рисовать каждый раз)
export function buildCaveBackground() {
  bgCanvas = document.createElement('canvas'); 
  bgCanvas.width = 320; 
  bgCanvas.height = 320;
  const c = bgCanvas.getContext('2d'); 
  c.fillStyle = '#26211d'; 
  c.fillRect(0, 0, 320, 320);
  
  for (let i = 0; i < 160; i++) {
    const x = Math.random()*320, y = Math.random()*320, r = 4 + Math.random()*18;
    c.fillStyle = Math.random() < 0.5 ? 'rgba(64,54,48,0.35)' : 'rgba(28,24,22,0.35)';
    c.beginPath(); c.ellipse(x, y, r, r*(0.5+Math.random()*0.7), Math.random()*Math.PI, 0, 2*Math.PI); c.fill();
  }
  for (let i = 0; i < 14; i++) {
    let x = Math.random()*320, y = Math.random()*320;
    c.strokeStyle = 'rgba(12,10,9,0.5)'; c.lineWidth = 1 + Math.random()*1.5; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (Math.random()-0.5)*40; y += (Math.random()-0.5)*40; c.lineTo(x, y); } c.stroke();
  }
  c.fillStyle = 'rgba(10,8,8,0.85)';
  for (let i = 0; i < 8; i++) {
    const x = i*40 + Math.random()*20, w = 14 + Math.random()*18, h = 20 + Math.random()*36;
    c.beginPath(); c.moveTo(x-w/2, 0); c.lineTo(x+w/2, 0); c.lineTo(x, h); c.closePath(); c.fill();
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.random()*320, w = 16 + Math.random()*20, h = 14 + Math.random()*30;
    c.beginPath(); c.moveTo(x-w/2, 320); c.lineTo(x+w/2, 320); c.lineTo(x, 320-h); c.closePath(); c.fill();
  }
  const g = c.createRadialGradient(160, 160, 80, 160, 160, 230);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = g; c.fillRect(0, 0, 320, 320);
}

// Проверка, свободна ли клетка (нет ли там игрока, лестницы или монстра)
export function cellFree(mx, my, monstersArr) {
  if (state.player.x === mx && state.player.y === my) return false;
  if (state.stairs.x === mx && state.stairs.y === my && !state.stairs.active) return false;
  return !monstersArr.some(o => o.x === mx && o.y === my);
}

// Спавн монстров на этаже
export function placeMonster(type, hp, dmg, behavior) {
  let mx, my, ok = false;
  for (let pass = 0; pass < 2 && !ok; pass++) {
    for (let tries = 0; tries < 300 && !ok; tries++) {
      mx = Math.floor(Math.random()*GRID)*CELL; 
      my = Math.floor(Math.random()*GRID)*CELL;
      if (pass === 0) { 
        const near = Math.abs(mx - state.player.x) <= 64 && Math.abs(my - state.player.y) <= 64; 
        if (near) continue; 
      }
      if (cellFree(mx, my, state.monsters)) ok = true;
    }
  }
  if (!ok) return;
  state.monsters.push({ x: mx, y: my, hp: hp, maxHp: hp, atk: dmg, def: ENEMY_BASE[type].def || 0, isStunned: false, stunTimer: 0, type: type, behavior: behavior });
}

// Инициализация нового этажа
export function initFloor() {
  buildCaveBackground(); 
  state.monsters = []; 
  state.items = []; 
  state.floaters = []; 
  state.stairs.active = false;
  state.player.x = 32; state.player.y = 160; state.player.px = 32; state.player.py = 160;
  
  // Спавн монстров (количество зависит от этажа)
  const count = Math.min(25, state.currentFloor + 2);
  for (let i = 0; i < count; i++) {
    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const base = ENEMY_BASE[type];
    let hp = base.hp + 10*(state.currentFloor-1); 
    let dmg = base.atk + (state.currentFloor-1);
    let behavior = 'hunt'; 
    if (state.gameMode === 'chase' || state.gameMode === 'endless_chase') behavior = 'flee';
    placeMonster(type, hp, dmg, behavior);
  }
  
  // Ставим лестницу в случайное место
  state.stairs = { x: 128, y: 128, active: false };
}