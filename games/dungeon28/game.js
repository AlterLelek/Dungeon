// games/dungeon28/game.js
import { CELL } from './config.js';
import { state, getTotalAtk, getTotalDef, randomInt } from './state.js';
import { initFloor, findFreeCell } from './map.js';

export function addFloater(x, y, text, color) { 
  state.floaters.push({ x: x + 16, y: y + 10, text: text, color: color, life: 1.0, maxLife: 1.0, vy: -0.8 }); 
}

// Удар по монстру
export function fight(m, index) {
  let pDmg = getTotalAtk() - m.def; if (pDmg < 1) pDmg = 1;
  m.hp -= pDmg; addFloater(m.x, m.y, "-" + pDmg, "#ef4444");
  
  if (m.hp <= 0) {
    state.monsters.splice(index, 1); 
    state.goldCount += 2; state.energy += 1;
    return true; // Монстр убит
  }
  
  // Ответный удар
  if (!m.isStunned) {
    const mDmg = Math.max(0, m.atk - getTotalDef());
    if (mDmg > 0) {
      state.playerHp -= mDmg; 
      addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444");
    }
  }
  return false;
}

// Движение игрока
export function movePlayer(dx, dy) {
  if (!state.gameActive || state.playerHp <= 0) return;
  let nx = state.player.x + dx, ny = state.player.y + dy;
  if (nx < 0 || nx >= 320 || ny < 0 || ny >= 320) return;
  
  // Проверка на монстра (атака вместо шага)
  let victimIdx = state.monsters.findIndex(m => m.x === nx && m.y === ny);
  if (victimIdx !== -1) {
    fight(state.monsters[victimIdx], victimIdx);
    return;
  }
  
  state.player.x = nx; state.player.y = ny;
  
  // Проверка на лестницу
  if (state.stairs.active && nx === state.stairs.x && ny === state.stairs.y) {
    state.currentFloor++;
    initFloor();
    return;
  }
  
  // Логика сбора предметов и хода монстров (упрощенная)
  let pickupIdx = state.items.findIndex(i => i.x === nx && i.y === ny);
  if (pickupIdx !== -1) {
    const item = state.items[pickupIdx];
    if (item.type === 'coin') { state.goldCount += 2; addFloater(nx, ny, "+2g", "#fbbf24"); }
    if (item.type === 'star') { let add = randomInt(1,3); state.tempAtk += add; addFloater(nx, ny, "+" + add, "#a78bfa"); }
    if (item.type === 'shield') { let add = randomInt(1,3); state.tempDef += add; addFloater(nx, ny, "+" + add, "#3b82f6"); }
    if (item.type === 'heart') { state.playerHp += 20; addFloater(nx, ny, "+20", "#22c55e"); }
    if (item.type === 'scroll') { state.energy += 2; addFloater(nx, ny, "+2⚡", "#eab308"); }
    state.items.splice(pickupIdx, 1);
  }
  
  // Генерация нового лута (каждый 3-й ход)
  state.totalTurns++;
  if (state.totalTurns % 3 === 0 && !state.stairs.active) {
    const cell = findFreeCell();
    state.items.push({x:cell.x, y:cell.y, type: ['coin', 'star', 'shield', 'heart'][Math.floor(Math.random()*4)]});
  }
  
  // Ход монстров (простой: монстры идут к игроку)
  state.monsters.forEach((m, idx) => {
    if (m.isStunned) return;
    const mdx = state.player.x - m.x;
    const mdy = state.player.y - m.y;
    // Если стоят рядом - бьют
    if (Math.abs(mdx) <= 32 && Math.abs(mdy) <= 32) {
      const mDmg = Math.max(1, m.atk - getTotalDef());
      state.playerHp -= mDmg;
      addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444");
    } else {
      // Иначе делают шаг
      if (Math.abs(mdx) > Math.abs(mdy)) m.x += Math.sign(mdx) * 32;
      else m.y += Math.sign(mdy) * 32;
    }
  });
  
  if (state.playerHp <= 0) {
    alert("Вы погибли! Игра окончена.");
    state.gameActive = false;
    location.reload();
  }
}