// games/dungeon28/game.js
import { CELL } from './config.js';
import { state, getTotalAtk, getTotalDef, randomInt } from './state.js';
import { initFloor, findFreeCell } from './map.js';
import { playSound } from '../../shared/audio.js';

// Добавление всплывающей цифры (урон, лечение, бафф)
export function addFloater(x, y, text, color) { 
  state.floaters.push({ x: x + CELL / 2, y: y + 10, text: text, color: color, life: 1.0, maxLife: 1.0, vy: -0.8 }); 
}

// Бой с монстром
export function fight(m, index) {
  // Урон игрока по монстру
  let pDmg = getTotalAtk() - m.def; 
  if (pDmg < 1) pDmg = 1;
  m.hp -= pDmg; 
  addFloater(m.x, m.y, "-" + pDmg, "#ef4444");
  
  if (m.hp <= 0) {
    // Монстр убит
    state.monsters.splice(index, 1); 
    state.goldCount += 2; 
    state.energy += 1;
    return true; 
  }
  
  // Ответный удар монстра (если он не в стане)
  if (!m.isStunned) {
    const mDmg = Math.max(0, m.atk - getTotalDef());
    if (mDmg > 0) {
      state.playerHp -= mDmg; 
      addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444");
    } else {
      addFloater(state.player.px, state.player.py, "0", "#9ca3af");
    }
  }
  return false;
}

// Логика хода монстров
function moveMonsters() {
  state.monsters.forEach((m, idx) => {
    if (m.isStunned) {
      m.stunTimer--;
      if (m.stunTimer <= 0) m.isStunned = false;
      return;
    }

    const dx = state.player.x - m.x;
    const dy = state.player.y - m.y;

    // Если монстр стоит на одной клетке с игроком или прямо рядом — он атакует
    if (Math.abs(dx) <= CELL && Math.abs(dy) <= CELL && (dx === 0 || dy === 0)) {
      fight(m, idx); // Монстр бьет игрока (и получает сдачи)
      return;
    }

    // Иначе двигается в сторону игрока (простой ИИ)
    let nx = m.x;
    let ny = m.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      nx += Math.sign(dx) * CELL;
    } else {
      ny += Math.sign(dy) * CELL;
    }

    // Проверка, чтобы монстр не вылетел за карту или не встал на другого
    if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320) {
      let blocked = state.monsters.some(o => o !== m && o.x === nx && o.y === ny);
      if (!blocked) {
        m.x = nx;
        m.y = ny;
      }
    }
  });
}

// Движение игрока
export function movePlayer(dx, dy) {
  if (!state.gameActive || state.playerHp <= 0) return;
  
  let nx = state.player.x + dx;
  let ny = state.player.y + dy;
  if (nx < 0 || nx >= 320 || ny < 0 || ny >= 320) return;
  
  // Проверяем, есть ли на клетке монстр
  let victimIdx = state.monsters.findIndex(m => m.x === nx && m.y === ny);
  if (victimIdx !== -1) {
    fight(state.monsters[victimIdx], victimIdx);
    if (state.playerHp <= 0) endGame();
    return;
  }
  
  // Двигаем героя
  state.player.x = nx; 
  state.player.y = ny;
  
  // Проверка на лестницу
  if (state.stairs.active && nx === state.stairs.x && ny === state.stairs.y) {
    state.currentFloor++;
    initFloor();
    return;
  }
  
  // Логика сбора предметов
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
  
  // Спавн нового лута (каждый 3-й ход)
  state.totalTurns++;
  if (state.totalTurns % 3 === 0 && !state.stairs.active) {
    const cell = findFreeCell();
    state.items.push({x:cell.x, y:cell.y, type: ['coin', 'star', 'shield', 'heart'][Math.floor(Math.random()*4)]});
  }
  
  // Ход монстров после хода игрока
  moveMonsters();
  
  // Проверка на смерть
  if (state.playerHp <= 0) endGame();
}

// Конец игры
function endGame() {
  state.gameActive = false;
  alert("Вы погибли! Игра окончена.");
  location.reload();
}