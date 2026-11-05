// games/dungeon28/game.js
import { CELL } from './config.js';
import { state, getTotalAtk, getTotalDef, randomInt } from './state.js';
import { initFloor, findFreeCell } from './map.js';
import { playSound } from '../../shared/audio.js?v=9'; 

export function addFloater(x, y, text, color) { 
  state.floaters.push({ x: x + CELL / 2, y: y + 10, text: text, color: color, life: 1.0, maxLife: 1.0, vy: -0.8 }); 
}

// Атака ИГРОКА по монстру
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
    return true; // Монстр убит, можно проходить
  }
  
  // Ответный удар монстра
  if (!m.isStunned) {
    const mDmg = Math.max(0, m.atk - getTotalDef());
    if (mDmg > 0) {
      state.playerHp -= mDmg; 
      addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444");
    } else {
      addFloater(state.player.px, state.player.py, "0", "#9ca3af");
    }
  }
  return false; // Монстр выжил, игрок остается на месте
}

// Атака МОНСТРА по игроку (во время хода монстров)
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

    // 1. КУБИК НА ТЕЛЕПОРТАЦИЮ (25% шанс)
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
                return; // Телепортировался и закончил ход
            }
        }
    }

    // 2. КУБИК НА ШАГИ К ГЕРОЮ (1-3 шага)
    let steps = randomInt(1, 3);
    
    for (let s = 0; s < steps; s++) {
        const dx = state.player.x - m.x;
        const dy = state.player.y - m.y;

        // Если монстр стоит на одной клетке с игроком или рядом — он атакует
        if (Math.abs(dx) <= CELL && Math.abs(dy) <= CELL && (dx === 0 || dy === 0)) {
            monsterAttack(m); 
            break; 
        }

        // Иначе делает 1 шаг в сторону игрока
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
                break; // Если путь перекрыт, оставшиеся шаги сгорают
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
  let canMove = false;

  if (victimIdx !== -1) {
    const killed = fight(state.monsters[victimIdx], victimIdx);
    if (state.playerHp <= 0) { endGame(); return; }
    
    // Если убили — идем на его место. Если нет — стоим и бьем.
    if (killed) canMove = true; 
  } else {
    canMove = true; 
  }
  
  if (canMove) {
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
  }
  
  // Монстры ходят после игрока
  moveMonsters();
  
  if (state.playerHp <= 0) endGame();
}

function endGame() {
  state.gameActive = false;
  alert("Вы погибли! Игра окончена.");
  location.reload();
}