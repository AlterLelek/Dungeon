import { CELL, ITEM_TYPES, HEROES } from './config.js';
import { state, getTotalAtk, getTotalDef, randomInt, clearBonuses } from './state.js';
import { initFloor, findFreeCell, placeMonster } from './map.js';
import { playSound } from './audio.js'; 

let fadeTimer = null;
let floorClearTimer = null;

export function addFloater(x, y, text, color) { 
  state.floaters.push({ x: x + CELL / 2, y: y + 10, text: text, color: color, life: 1.0, maxLife: 1.0, vy: -0.8 }); 
}

export function startFadeOut() {
  if (fadeTimer) return;
  fadeTimer = setInterval(() => {
    if (state.items.length === 0) {
      clearInterval(fadeTimer); fadeTimer = null; return;
    }
    const removeCount = Math.max(1, Math.ceil(state.items.length / 40));
    state.items.splice(0, removeCount);
    playSound('collect');
  }, 100);
}

function autoNextFloor() {
    if (floorClearTimer) clearTimeout(floorClearTimer);
    floorClearTimer = setTimeout(() => {
        if (state.gameActive && state.monsters.length === 0) {
            state.currentFloor++;
            clearBonuses();
            initFloor();
            floorClearTimer = null;
        }
    }, 1500);
}

export function fight(m, index, ranged = false) {
  playSound('hit'); 
  let pDmg = getTotalAtk() - m.def; if (pDmg < 1) pDmg = 1;
  m.hp -= pDmg; 
  addFloater(m.x, m.y, "-" + pDmg, "#ef4444");
  
  if (m.hp <= 0) {
    playSound('kill'); 
    state.monsters.splice(index, 1); 
    state.goldCount += 2; 
    state.playerMp += 1; 
    state.stats.kills++;
    
    if (m.type === "🐭" && !m.hasSplit) {
        const dirs = [[0,-1], [0,1], [-1,0], [1,0]];
        let spawned = 0;
        for (let d of dirs) {
            if (spawned >= 2) break;
            let nx = m.x + d[0] * CELL;
            let ny = m.y + d[1] * CELL;
            if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320) {
                if (!state.monsters.some(o => o.x === nx && o.y === ny) && !(state.player.x === nx && state.player.y === ny)) {
                    placeMonster("🐭", Math.max(1, Math.floor(m.maxHp/2)), Math.max(1, Math.floor(m.atk/2)), m.behavior, nx, ny);
                    state.monsters[state.monsters.length - 1].hasSplit = true;
                    spawned++;
                }
            }
        }
        if (spawned > 0) addFloater(m.x, m.y, "Размножение!", "#a855f7");
    }
    
    state.corpses.push({ x: m.x, y: m.y, type: m.type, decay: 15 });
    
    if (state.monsters.length === 0) {
        state.stairs.active = true;
        startFadeOut();
        autoNextFloor();
    }
    return true; 
  }
  
  if (!ranged && !m.isStunned) {
    const mDmg = Math.max(0, m.atk - getTotalDef());
    if (mDmg > 0) {
      state.playerHp -= mDmg; 
      addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444");
    }
  }
  return false;
}

// МАГИЯ
export function castLightning() {
    if (state.playerMp < 3 || state.spellLightning <= 0) return;
    state.playerMp -= 3; state.spellLightning--;
    playSound('magic');
    state.monsters.forEach((m, idx) => {
        const dx = Math.abs(m.x - state.player.x);
        const dy = Math.abs(m.y - state.player.y);
        if (dx <= 64 && dy <= 64) {
            m.hp -= 20;
            addFloater(m.x, m.y, "-20", "#fbbf24");
            if (m.hp <= 0) {
                state.monsters.splice(idx, 1);
                state.goldCount += 2;
                state.stats.kills++;
                state.corpses.push({ x: m.x, y: m.y, type: m.type, decay: 15 });
            }
        }
    });
    if (state.monsters.length === 0) {
        state.stairs.active = true;
        startFadeOut();
        autoNextFloor();
    }
}

export function castHeal() {
    if (state.playerMp < 3 || state.spellHeal <= 0) return;
    state.playerMp -= 3; state.spellHeal--;
    playSound('magic');
    state.playerHp += 30;
    if (state.playerHp > HEROES[state.heroIdx].maxHp) state.playerHp = HEROES[state.heroIdx].maxHp;
    addFloater(state.player.px, state.player.py, "+30hp", "#22c55e");
}

export function castStun() {
    if (state.playerMp < 2 || state.spellStun <= 0) return;
    state.playerMp -= 2; state.spellStun--;
    playSound('magic');
    state.monsters.forEach(m => {
        m.isStunned = true;
        m.stunTimer = 2;
        addFloater(m.x, m.y, "❄️", "#38bdf8");
    });
}

export function castHurricane() {
    if (state.playerMp < 4 || state.spellHurricane <= 0) return;
    state.playerMp -= 4; state.spellHurricane--;
    playSound('magic');
    
    state.monsters.forEach(m => {
        const dx = m.x - state.player.x;
        const dy = m.y - state.player.y;
        if (Math.abs(dx) <= 64 && Math.abs(dy) <= 64) {
            let nx = m.x + Math.sign(dx) * CELL * 3;
            let ny = m.y + Math.sign(dy) * CELL * 3;
            if (nx < 0) nx = 0;
            if (nx >= 320) nx = 288;
            if (ny < 0) ny = 0;
            if (ny >= 320) ny = 288;
            m.x = nx; m.y = ny;
            m.startPx = m.px; m.startPy = m.py;
            m.moveStartTime = performance.now(); m.isMoving = true;
            addFloater(m.x, m.y, "🌪️", "#a855f7");
        }
    });
}

function monsterAttack(m) {
  if (!m.isStunned) {
    playSound('hit');
    const mDmg = Math.max(0, m.atk - getTotalDef());
    if (mDmg > 0) {
      state.playerHp -= mDmg; 
      addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444");
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

    if (m.type === "🧙‍♂️" && Math.random() < 0.3) {
        const corpseIdx = state.corpses.findIndex(c => 
            c.type !== "🧟" && Math.abs(c.x - m.x) <= CELL * 2 && Math.abs(c.y - m.y) <= CELL * 2
        );
        if (corpseIdx !== -1) {
            const corpse = state.corpses[corpseIdx];
            state.corpses.splice(corpseIdx, 1);
            placeMonster("🧟", 150, 6, m.behavior, corpse.x, corpse.y);
            addFloater(corpse.x, corpse.y, "☠️ Восстал!", "#a78bfa");
            playSound('magic');
            return; 
        }
    }

    if (m.type === "🏹") {
        const dx = Math.abs(m.x - state.player.x);
        const dy = Math.abs(m.y - state.player.y);
        if (dx <= CELL * 3 && dy <= CELL * 3) {
            monsterAttack(m);
            addFloater(m.x, m.y, "🏹", "#f59e0b");
            return; 
        }
    }
    if (m.type === "👼" && m.hp < m.maxHp) {
        m.hp = Math.min(m.maxHp, m.hp + 10);
        addFloater(m.x, m.y, "+10", "#22c55e");
    }

    if (m.actionState === 0) {
        let steps = (m.type === "🕷") ? 2 : randomInt(1, 3); 
        if (m.slowTurns > 0) { steps = Math.max(1, Math.floor(steps / 2)); m.slowTurns--; }
        for (let s = 0; s < steps; s++) {
            const dx = state.player.x - m.x;
            const dy = state.player.y - m.y;

            if (Math.abs(dx) <= CELL && Math.abs(dy) <= CELL && (dx === 0 || dy === 0)) {
                monsterAttack(m); 
                break; 
            }

            let nx = m.x;
            let ny = m.y;

            if (Math.abs(dx) >= Math.abs(dy)) nx += Math.sign(dx) * CELL;
            else ny += Math.sign(dy) * CELL;

            if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320) {
                let blocked = state.monsters.some(o => o !== m && o.x === nx && o.y === ny);
                let playerBlocked = (nx === state.player.x && ny === state.player.y);
                
                if (!blocked && !playerBlocked) {
                    m.x = nx; m.y = ny;
                    m.startPx = m.px; m.startPy = m.py;
                    m.moveStartTime = performance.now(); m.isMoving = true;
                } else break; 
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
                m.x = nx; m.y = ny;
                m.startPx = m.px; m.startPy = m.py;
                m.moveStartTime = performance.now(); m.isMoving = true;
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
  if (!state.gameActive || state.playerHp <= 0 || floorClearTimer) return;
  
  let nx = state.player.x + dx;
  let ny = state.player.y + dy;
  if (nx < 0 || nx >= 320 || ny < 0 || ny >= 320) return;
  
  let victimIdx = state.monsters.findIndex(m => m.x === nx && m.y === ny);
  
  // СТРЕЛЬБА ЛУЧНИКА НА 2 КЛЕТКИ
  if (victimIdx === -1) {
    const hero = HEROES[state.heroIdx];
    if (hero.set === 'archer' && hero.attackRange >= 2) {
      const tx = nx + dx;
      const ty = ny + dy;
      if (tx >= 0 && tx < 320 && ty >= 0 && ty < 320) {
        const rangedIdx = state.monsters.findIndex(m => m.x === tx && m.y === ty);
        if (rangedIdx !== -1) {
          const m = state.monsters[rangedIdx];
          fight(m, rangedIdx, true);
          
          if (hero.name === 'Лучник') {
            if (!m.slowedByArrow) {
              m.slowTurns = 1;
              m.slowedByArrow = true;
              addFloater(m.x, m.y, "❄️", "#38bdf8");
            } else {
              m.slowedByArrow = false;
            }
          } else if (hero.name === 'Тёмный арбалетчик') {
            const heal = Math.min(5, hero.maxHp - state.playerHp);
            if (heal > 0) {
              state.playerHp += heal;
              addFloater(state.player.px, state.player.py, "+" + heal + "hp", "#22c55e");
            }
          }
          
          if (state.playerHp <= 0) { endGame(); return; }
          
          state.totalTurns++;
          state.corpses.forEach(c => c.decay--);
          state.corpses = state.corpses.filter(c => c.decay > 0);
          
          moveMonsters();
          if (state.playerHp <= 0) endGame();
          return;
        }
      }
    }
  }
  
  if (victimIdx !== -1) {
    const m = state.monsters[victimIdx];
    const killed = fight(m, victimIdx);
    if (state.playerHp <= 0) { endGame(); return; }
    
    if (!killed) {
      m.x = state.player.x; m.y = state.player.y;
      m.startPx = m.px; m.startPy = m.py;
      m.moveStartTime = performance.now(); m.isMoving = true;
    }
  }
  
  state.player.x = nx; state.player.y = ny;
  state.player.startPx = state.player.px; state.player.startPy = state.player.py;
  state.player.moveStartTime = performance.now(); state.player.isMoving = true;
  
  playSound('step'); 
  
  if (state.stairs.active && nx === state.stairs.x && ny === state.stairs.y) {
    state.currentFloor++;
    clearBonuses(); 
    initFloor();
    return;
  }
  
  let pickupIdx = state.items.findIndex(i => i.x === nx && i.y === ny);
  if (pickupIdx !== -1) {
    const item = state.items[pickupIdx];
    playSound('collect'); 
    
    if (item.type === 'coin') { let add = randomInt(1, 3); state.goldCount += add; state.stats.gold += add; addFloater(nx, ny, "+" + add + "g", "#fbbf24"); }
    if (item.type === 'star') { let add = randomInt(1, 3); state.tempAtk += add; addFloater(nx, ny, "+" + add + "а", "#a78bfa"); }
    if (item.type === 'shield') { let add = randomInt(1, 3); state.tempDef += add; addFloater(nx, ny, "+" + add + "з", "#3b82f6"); }
    if (item.type === 'scroll') { let add = randomInt(1, 3); state.playerMp += add; state.spellHeal++; addFloater(nx, ny, "+1л", "#22c55e"); }
    if (item.type === 'heart') { state.playerHp += 20; addFloater(nx, ny, "+20hp", "#22c55e"); }
    if (item.type === 'lightning') { state.spellLightning++; state.playerMp += 1; addFloater(nx, ny, "+1⚡", "#fbbf24"); }
    if (item.type === 'stun') { state.spellStun++; addFloater(nx, ny, "+1❄️", "#38bdf8"); }
    if (item.type === 'hurricane') { state.spellHurricane++; addFloater(nx, ny, "+1🌪️", "#a855f7"); }
    
    state.items.splice(pickupIdx, 1);
  }
  
  state.totalTurns++;
  
  state.corpses.forEach(c => c.decay--);
  state.corpses = state.corpses.filter(c => c.decay > 0);
  
  if (state.totalTurns % state.settings.itemRate === 0 && !state.stairs.active) {
    const cell = findFreeCell();
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    state.items.push({x:cell.x, y:cell.y, type: type});
  }
  
  moveMonsters();
  if (state.playerHp <= 0) endGame();
}

export function skipTurn() {
    if (!state.gameActive) return;
    const victimIdx = state.monsters.findIndex(m => m.x === state.player.x && m.y === state.player.y);
    if (victimIdx !== -1) { fight(state.monsters[victimIdx], victimIdx); if (!state.gameActive) return; }
    else playSound('skip');
    
    state.totalTurns++;
    state.corpses.forEach(c => c.decay--);
    state.corpses = state.corpses.filter(c => c.decay > 0);
    
    moveMonsters();
    if (state.playerHp <= 0) endGame();
}

function endGame() {
  state.gameActive = false;
  alert("Вы погибли! Игра окончена.");
  location.reload();
}