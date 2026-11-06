// games/dungeon28/game.js
import { CELL, ITEM_TYPES } from './config.js';
import { state, getTotalAtk, getTotalDef, randomInt } from './state.js';
import { initFloor, findFreeCell } from './map.js';
import { playSound } from '../../shared/audio.js?v=11'; 

export function addFloater(x, y, text, color) { 
  state.floaters.push({ x: x + CELL / 2, y: y + 10, text: text, color: color, life: 1.0, maxLife: 1.0, vy: -0.8 }); 
}

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
    state.stats.kills++;
    return true; 
  }
  
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

    if (m.actionState === 0) {
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
                    // ЗАПУСКАЕМ ПЛАВНОСТЬ ДЛЯ МОНСТРА
                    m.startPx = m.px;
                    m.startPy = m.py;
                    m.moveStartTime = performance.now();
                    m.isMoving = true;
                } else {
                    break; 
                }
            }
        }
        m.actionState = 1; 
    } 
    else if (m.actionState === 1) {
        const dist = randomInt(1, 4); 
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
                // ЗАПУСКАЕМ ПЛАВНОСТЬ ДЛЯ ТЕЛЕПОРТА
                m.startPx = m.px;
                m.startPy = m.py;
                m.moveStartTime = performance.now();
                m.isMoving = true;
                addFloater(m.x, m.y, "Teleport", "#a78bfa"); 
            }
        }
        
        m.actionState = 2; 
        m.restTimer = randomInt(1, 3); 
    }
    else if (m.actionState === 2) {
        if (m.restTimer > 0) {
            m.restTimer--;
            addFloater(m.x, m.y, "zzZ", "#9ca3af"); 
            return;
        } else {
            m.actionState = 0; 
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
    
    if (!killed) {
      m.x = state.player.x;
      m.y = state.player.y;
      // ПЛАВНОСТЬ ДЛЯ ОТБРОШЕННОГО МОНСТРА
      m.startPx = m.px;
      m.startPy = m.py;
      m.moveStartTime = performance.now();
      m.isMoving = true;
    }
  }
  
  state.player.x = nx; 
  state.player.y = ny;
  
  // ЗАПУСКАЕМ ПЛАВНОСТЬ ДЛЯ ГЕРОЯ
  state.player.startPx = state.player.px;
  state.player.startPy = state.player.py;
  state.player.moveStartTime = performance.now();
  state.player.isMoving = true;
  
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
    
    if (item.type === 'coin') { 
        let add = randomInt(1, 3); state.goldCount += add; state.stats.gold += add; addFloater(nx, ny, "+" + add + "g", "#fbbf24"); 
    }
    if (item.type === 'star') { 
        let add = randomInt(1, 3); state.tempAtk += add; addFloater(nx, ny, "+" + add + "а", "#a78bfa"); 
    }
    if (item.type === 'shield') { 
        let add = randomInt(1, 3); state.tempDef += add; addFloater(nx, ny, "+" + add + "з", "#3b82f6"); 
    }
    if (item.type === 'scroll') { 
        let add = randomInt(1, 3); state.energy += add; addFloater(nx, ny, "+" + add + "м", "#eab308"); 
    }
    
    if (item.type === 'heart') { state.playerHp += 20; addFloater(nx, ny, "+20hp", "#22c55e"); }
    if (item.type === 'lightning') { state.energy += 1; addFloater(nx, ny, "+1⚡", "#fbbf24"); }
    if (item.type === 'stun') { state.energy += 1; addFloater(nx, ny, "+1❄️", "#38bdf8"); }
    
    state.items.splice(pickupIdx, 1);
  }
  
  state.totalTurns++;
  
  if (state.totalTurns % state.settings.itemRate === 0 && !state.stairs.active) {
    const cell = findFreeCell();
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    state.items.push({x:cell.x, y:cell.y, type: type});
  }
  
  moveMonsters();
  if (state.playerHp <= 0) endGame();
}

function endGame() {
  state.gameActive = false;
  alert("Вы погибли! Игра окончена.");
  location.reload();
}