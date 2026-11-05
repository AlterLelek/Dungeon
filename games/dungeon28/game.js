// games/dungeon28/game.js
import { CELL } from './config.js';
import { state, getTotalAtk, getTotalDef, randomInt } from './state.js';
import { initFloor, findFreeCell } from './map.js';
import { playSound } from '../../shared/audio.js?v=9'; 

export function addFloater(x, y, text, color) { 
  state.floaters.push({ x: x + CELL / 2, y: y + 10, text: text, color: color, life: 1.0, maxLife: 1.0, vy: -0.8 }); 
}

// Игрок бьет монстра
export function fight(m, index) {
  playSound('hit'); 
  let pDmg = getTotalAtk() - m.def; 
  if (pDmg < 1) pDmg = 1;
  m.hp -= pDmg; 
  addFloater(m.x, m.y, "-" + pDmg, "#ef4444");
  
  if (m.hp <= 0) {
    playSound('kill'); 
    state.monsters.splice(index, 1); 
    state.goldCount += 2; 
    state.energy += 1;
    return true; 
  }
  
  // Монстр бьет в ответ
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

function monsterAttack(m) {
  if (!m.isStunned) {
    playSound('hit');
    const mDmg = Math.max(0, m.atk - getTotalDef());
    if (mDmg > 0) {
      state.playerHp -= mDmg; 
      addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444");
    } else {
      addFloater(state.player.px, state.player.py, "0", "#9ca3af");
    }
  }
}

function moveMonsters() {
  state.monsters.forEach((m, idx) => {
    if (m.isStunned) {
      m.stunTimer--;
      if (m.stunTimer <= 0) m.isStunned = false;
      return;
    }

    // 1. КУБИК НА ТЕЛЕПОРТАЦИЮ
    if (Math.random() < 0.25) {
        const dist = randomInt(1, 3); 
        const dirs = [[1,0], [-1,0], [0,1], [0,-1]]; 
        const dir = dirs[Math.floor(Math.random() * 4)]; 
        let nx = m.x + dir[0] * dist * CELL;
        let ny = m.y + dir[1] * dist * CELL;

        if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320) {
            let blocked = state.monsters.some(o => o !== m && o.x === nx && o.y === ny);
            let playerBlocked = (nx === state.player.x && ny === state.player.y); 
            if (!blocked && !playerBlocked) {
                m.x = nx;
                m.y = ny;
                addFloater(m.x, m.y, "Teleport", "#a78bfa"); 
                return; 
            }
        }
    }

    // 2. КУБИК НА ШАГИ
    let steps = randomInt(1, 3);
    
    for (let s = 0; s < steps; s++) {
        const dx = state.player.x - m.x;
        const dy = state.player.y - m.y;

        if (Math.abs(dx) <= CELL && Math.abs(dy) <= CELL && (dx === 0 || dy === 0)) {
            monsterAttack(m); 
            break; 
        }

        let nx = m.x;
        let ny = m.y;

        if (Math.abs(dx) >= Math.abs(dy)) {
            nx += Math.sign(dx) * CELL;
        } else {
            ny += Math.sign(dy) * CELL;
        }

        if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320) {
            let blocked = state.monsters.some(o => o !== m && o.x === nx && o.y === ny);
            let playerBlocked = (nx === state.player.x && ny === state.player.y);
            
            if (!blocked && !playerBlocked) {
                m.x = nx;
                m.y = ny;
            } else {
                break; 
            }
        }
    }
  });
}

export function movePlayer(dx, dy) {
  if (!state.gameActive || state.playerHp <= 0) return;
  
  let nx = state.player.x + dx;
  let ny = state.player.y + dy;
  if (nx < 0 || nx >= 320 || ny < 0 || ny >= 320) return;
  
  let victimIdx = state.monsters.findIndex(m => m.x === nx && m.y === ny);
  
  if (victimIdx !== -1) {
    const m = state.monsters[victimIdx];
    const killed = fight(m, victimIdx);
    if (state.playerHp <= 0) { endGame(); return; }
    
    // ПРОХОД СКВОЗЬ МОНСТРА: Если убили - просто идем. Если нет - меняемся местами.
    if (!killed) {
        m.x = state.player.x;
        m.y = state.player.y;
    }
  }
  
  // Двигаем игрока на новую клетку
  state.player.x = nx; 
  state.player.y = ny;
  playSound('step'); 
  
  if (state.stairs.active && nx === state.stairs.x && ny === state.stairs.y) {
    state.currentFloor++;
    initFloor();
    return;
  }
  
  let pickupIdx = state.items.findIndex(i => i.x === nx && i.y === ny);
  if (pickupIdx !== -1) {
    const item = state.items[pickupIdx];
    playSound('collect'); 
    
    if (item.type === 'coin') { state.goldCount += 2; addFloater(nx, ny, "+2g", "#fbbf24"); }
    if (item.type === 'star') { let add = randomInt(1,3); state.tempAtk += add; addFloater(nx, ny, "+" + add, "#a78bfa"); }
    if (item.type === 'shield') { let add = randomInt(1,3); state.tempDef += add; addFloater(nx, ny, "+" + add, "#3b82f6"); }
    if (item.type === 'heart') { state.playerHp += 20; addFloater(nx, ny, "+20", "#22c55e"); }
    if (item.type === 'scroll') { state.energy += 2; addFloater(nx, ny, "+2⚡", "#eab308"); }
    state.items.splice(pickupIdx, 1);
  }
  
  state.totalTurns++;
  if (state.totalTurns % 3 === 0 && !state.stairs.active) {
    const cell = findFreeCell();
    state.items.push({x:cell.x, y:cell.y, type: ['coin', 'star', 'shield', 'heart'][Math.floor(Math.random()*4)]});
  }
  
  moveMonsters();
  if (state.playerHp <= 0) endGame();
}

function endGame() {
  state.gameActive = false;
  alert("Вы погибли! Игра окончена.");
  location.reload();
}