// games/dungeon28/map.js
import { GRID, CELL, ENEMY_TYPES, ENEMY_BASE, ITEM_TYPES } from './config.js';
import { state, randomInt } from './state.js';

let bgCanvas = null;

// Рисуем красивый фон пещеры
export function buildCaveBackground() {
  bgCanvas = document.createElement('canvas'); 
  bgCanvas.width = 320; bgCanvas.height = 320;
  const c = bgCanvas.getContext('2d'); 
  c.fillStyle = '#26211d'; c.fillRect(0, 0, 320, 320);
  
  // Текстура камня
  for (let i = 0; i < 160; i++) {
    const x = Math.random()*320, y = Math.random()*320, r = 4 + Math.random()*18;
    c.fillStyle = Math.random() < 0.5 ? 'rgba(64,54,48,0.35)' : 'rgba(28,24,22,0.35)';
    c.beginPath(); c.ellipse(x, y, r, r*(0.5+Math.random()*0.7), Math.random()*Math.PI, 0, 2*Math.PI); c.fill();
  }
  // Трещины
  for (let i = 0; i < 14; i++) {
    let x = Math.random()*320, y = Math.random()*320;
    c.strokeStyle = 'rgba(12,10,9,0.5)'; c.lineWidth = 1 + Math.random()*1.5; c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (Math.random()-0.5)*40; y += (Math.random()-0.5)*40; c.lineTo(x, y); } c.stroke();
  }
  // Сталактиты и сталагмиты
  c.fillStyle = 'rgba(10,8,8,0.85)';
  for (let i = 0; i < 8; i++) {
    const x = i*40 + Math.random()*20, w = 14 + Math.random()*18, h = 20 + Math.random()*36;
    c.beginPath(); c.moveTo(x-w/2, 0); c.lineTo(x+w/2, 0); c.lineTo(x, h); c.closePath(); c.fill();
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.random()*320, w = 16 + Math.random()*20, h = 14 + Math.random()*30;
    c.beginPath(); c.moveTo(x-w/2, 320); c.lineTo(x+w/2, 320); c.lineTo(x, 320-h); c.closePath(); c.fill();
  }
  // Виньетка (затемнение по краям)
  const g = c.createRadialGradient(160, 160, 80, 160, 160, 230);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = g; c.fillRect(0, 0, 320, 320);
  
  return bgCanvas;
}

// Проверка, свободна ли клетка
export function cellFree(mx, my, monstersArr) {
  if (state.player.x === mx && state.player.y === my) return false;
  if (state.stairs.x === mx && state.stairs.y === my && !state.stairs.active) return false;
  return !monstersArr.some(o => o.x === mx && o.y === my);
}

// Расстановка монстров
export function placeMonster(type, hp, dmg, behavior) {
  let mx, my, ok = false;
  for (let pass = 0; pass < 2 && !ok; pass++) {
    for (let tries = 0; tries < 300 && !ok; tries++) {
      mx = Math.floor(Math.random()*GRID)*CELL; my = Math.floor(Math.random()*GRID)*CELL;
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

// Поиск свободной клетки для лута
export function findFreeCell() {
  let x, y, tries = 0;
  do { 
    x = Math.floor(Math.random()*GRID)*CELL; 
    y = Math.floor(Math.random()*GRID)*CELL; 
    tries++; 
  } while ((state.monsters.some(m => m.x===x && m.y===y) || state.items.some(i => i.x===x && i.y===y) || (state.player.x===x && state.player.y===y) || (state.stairs.x===x && state.stairs.y===y)) && tries < 200);
  return {x, y};
}

// Генерация нового этажа
export function initFloor() {
  buildCaveBackground(); 
  state.monsters = []; 
  state.items = []; 
  state.floaters = []; 
  state.stairs.active = false;
  
  // Ставим героя в центр
  state.player.x = 5 * CELL; 
  state.player.y = 5 * CELL; 
  state.player.px = 5 * CELL; 
  state.player.py = 5 * CELL;
  
  // Спавним монстров (количество зависит от этажа)
  const count = Math.min(25, state.currentFloor + 3);
  for (let i = 0; i < count; i++) {
    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const base = ENEMY_BASE[type];
    let hp = base.hp + 10*(state.currentFloor-1); 
    let dmg = base.atk + (state.currentFloor-1);
    let behavior = (state.gameMode === 'chase' || state.gameMode === 'endless_chase') ? 'flee' : 'hunt';
    placeMonster(type, hp, dmg, behavior);
  }
  
  // Ставим лестницу в правом нижнем углу
  state.stairs = { x: 288, y: 288, active: false };
  
  return bgCanvas;
}