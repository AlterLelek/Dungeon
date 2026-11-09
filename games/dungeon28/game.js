import { CELL, ITEM_TYPES, HEROES, ENEMY_BASE } from './config.js';
import { state, getTotalAtk, getTotalDef, randomInt, clearBonuses } from './state.js';
import { initFloor, findFreeCell, placeMonster } from './map.js';
import { playSound } from './audio.js'; 

let fadeTimer = null;
let floorClearTimer = null;

export function addFloater(x, y, text, color) { 
  state.floaters.push({ x: x + CELL / 2, y: y + 10, text: text, color: color, life: 1.0, maxLife: 1.0, vy: -0.8 }); 
}

export function activateAbility() {
    if (state.abilityCooldown > 0) return;
    const hero = HEROES[state.heroIdx];
    state.abilityTurns = 5;
    state.abilityCooldown = 10;
    
    if (hero.name === 'Воин') {
        state.tempAtk += 5;
        addFloater(state.player.px, state.player.py, "+5 ATK", "#fbbf24");
    } else if (hero.name === 'Лучник') {
        state.heroAttackRange += 2;
        addFloater(state.player.px, state.player.py, "+2 RNG", "#fbbf24");
    } else if (hero.name === 'Маг') {
        state.spellDiscount = 1;
        addFloater(state.player.px, state.player.py, "-1 MP", "#fbbf24");
    } else if (hero.name === 'Паладин') {
        state.skeletonAlly = { x: state.player.x, y: state.player.y, hp: 50, maxHp: 50 };
        addFloater(state.player.px, state.player.py, "☠️ Союзник!", "#fbbf24");
    } else if (hero.name === 'Ангел') {
        state.playerHp = Math.min(state.devSettings.heroes[state.heroIdx].maxHp, state.playerHp + 50);
        addFloater(state.player.px, state.player.py, "+50 HP", "#fbbf24");
    }
    playSound('magic');
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
  let pDmg = getTotalAtk() - m.def; 
  
  // ЛУЧНИК БЬЕТ В БЛИЖНЕМ БОЮ 80% СИЛЫ
  if (HEROES[state.heroIdx].set === 'archer' && !ranged) {
      pDmg = Math.floor(pDmg * 0.8);
  }
  
  if (pDmg < 1) pDmg = 1;
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
                    const newHp = Math.max(1, Math.floor(m.maxHp / 3));
                    const newAtk = Math.max(1, Math.floor(m.atk / 3));
                    placeMonster("🐭", newHp, newAtk, m.behavior, nx, ny);
                    
                    const newMouse = state.monsters.find(o => o.x === nx && o.y === ny);
                    if (newMouse) {
                        newMouse.hasSplit = true;
                        newMouse.maxHp = newHp;
                    }
                    spawned++;
                }
            }
        }
        if (spawned > 0) addFloater(m.x, m.y, "Деление 1/3!", "#a855f7");
    }
    
    if (m.type !== "🐭" && m.type !== "🕷") {
        state.corpses.push({ x: m.x, y: m.y, type: m.type, decay: 15 });
    }
    
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

// МАГИЯ: Проверка целей ДО траты маны/зарядов
export function castLightning() {
    if (state.spellLightning <= 0) return;
    
    const targets = state.monsters.filter(m => Math.abs(m.x - state.player.x) <= 64 && Math.abs(m.y - state.player.y) <= 64);
    if (targets.length === 0) {
        addFloater(state.player.px, state.player.py, "Нет целей", "#9ca3af");
        return;
    }
    
    const cost = Math.max(0, 3 - state.spellDiscount);
    if (state.playerMp >= cost) { state.playerMp -= cost; }
    state.spellLightning--;
    
    playSound('magic');
    targets.forEach(m => {
        m.hp -= 20;
        addFloater(m.x, m.y, "-20", "#fbbf24");
        if (m.hp <= 0) {
            const idx = state.monsters.indexOf(m);
            if (idx > -1) state.monsters.splice(idx, 1);
            state.goldCount += 2;
            state.stats.kills++;
            if (m.type !== "🐭" && m.type !== "🕷") {
                state.corpses.push({ x: m.x, y: m.y, type: m.type, decay: 15 });
            }
        }
    });
    if (state.monsters.length === 0) { state.stairs.active = true; startFadeOut(); autoNextFloor(); }
}

export function castHeal() {
    if (state.spellHeal <= 0) return;
    
    const maxHp = state.devSettings.heroes[state.heroIdx].maxHp;
    if (state.playerHp >= maxHp) {
        addFloater(state.player.px, state.player.py, "Полное HP", "#9ca3af");
        return;
    }
    
    const cost = Math.max(0, 3 - state.spellDiscount);
    if (state.playerMp >= cost) { state.playerMp -= cost; }
    state.spellHeal--;
    
    playSound('magic');
    state.playerHp += 30;
    if (state.playerHp > maxHp) state.playerHp = maxHp;
    addFloater(state.player.px, state.player.py, "+30hp", "#22c55e");
}

export function castStun() {
    if (state.spellStun <= 0) return;
    const cost = Math.max(0, 2 - state.spellDiscount);
    if (state.playerMp >= cost) { state.playerMp -= cost; }
    state.spellStun--;
    
    playSound('magic');
    state.monsters.forEach(m => { m.isStunned = true; m.stunTimer = 2; addFloater(m.x, m.y, "❄️", "#38bdf8"); });
}

export function castHurricane() {
    if (state.spellHurricane <= 0) return;
    
    const targets = state.monsters.filter(m => Math.abs(m.x - state.player.x) <= 64 && Math.abs(m.y - state.player.y) <= 64);
    if (targets.length === 0) {
        addFloater(state.player.px, state.player.py, "Нет целей", "#9ca3af");
        return;
    }
    
    const cost = Math.max(0, 4 - state.spellDiscount);
    if (state.playerMp >= cost) { state.playerMp -= cost; }
    state.spellHurricane--;
    
    playSound('magic');
    targets.forEach(m => {
        const dx = m.x - state.player.x;
        const dy = m.y - state.player.y;
        let nx = m.x + Math.sign(dx) * CELL * 3;
        let ny = m.y + Math.sign(dy) * CELL * 3;
        if (nx < 0) nx = 0; if (nx >= 320) nx = 288;
        if (ny < 0) ny = 0; if (ny >= 320) ny = 288;
        m.x = nx; m.y = ny;
        m.startPx = m.px; m.startPy = m.py;
        m.moveStartTime = performance.now(); m.isMoving = true;
        addFloater(m.x, m.y, "🌪️", "#a855f7");
    });
}

function monsterAttack(m) {
  if (!m.isStunned) {
    playSound('hit');
    const mDmg = Math.max(0, m.atk - getTotalDef());
    
    if (m.type === "💀") { m.hp = Math.min(m.maxHp, m.hp + 3); addFloater(m.x, m.y, "+3 HP", "#22c55e"); }
    if (m.type === "👻") { state.playerMp = Math.max(0, state.playerMp - 2); addFloater(state.player.px, state.player.py, "-2 MP", "#3b82f6"); }
    if (m.type === "🕷") { 
        if (state.playerSlowTurns === 0) state.playerSlowTurns = 3; else state.playerSlowTurns += 1;
        addFloater(state.player.px, state.player.py, "🕸️ Замедлен", "#38bdf8"); 
    }
    if (m.type === "🧟") { 
        if (state.poisonTurns > 0) { state.poisonDmg += 3; state.poisonTurns = 3; } 
        else { state.poisonDmg = 5; state.poisonTurns = 3; } 
        addFloater(state.player.px, state.player.py, "☠️ Яд", "#22c55e"); 
    }

    if (state.skeletonAlly) {
        state.skeletonAlly.hp -= mDmg;
        addFloater(state.skeletonAlly.x, state.skeletonAlly.y, "-" + mDmg, "#ef4444");
        if (state.skeletonAlly.hp <= 0) { state.skeletonAlly = null; addFloater(m.x, m.y, "💀 Разбит", "#ef4444"); }
    } else {
        if (mDmg > 0) { state.playerHp -= mDmg; addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444"); }
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
        const corpseIdx = state.corpses.findIndex(c => c.type !== "🧟" && Math.abs(c.x - m.x) <= CELL * 2 && Math.abs(c.y - m.y) <= CELL * 2);
        if (corpseIdx !== -1) {
            const corpse = state.corpses[corpseIdx];
            state.corpses.splice(corpseIdx, 1);
            placeMonster("🧟", 150, 6, m.behavior, corpse.x, corpse.y);
            addFloater(corpse.x, corpse.y, "☠️ Восстал!", "#a78bfa"); playSound('magic'); return; 
        }
    }

    if (m.type === "🏹" || m.type === "🦹") {
        const dx = Math.abs(m.x - state.player.x);
        const dy = Math.abs(m.y - state.player.y);
        if (dx <= CELL * 3 && dy <= CELL * 3) {
            monsterAttack(m); addFloater(m.x, m.y, "🏹", "#f59e0b"); return; 
        }
    }
    
    if (m.type === "😈" && m.hp < m.maxHp) { m.hp = Math.min(m.maxHp, m.hp + 10); addFloater(m.x, m.y, "+10", "#22c55e"); }
    if (m.type === "👺") {
        const itemIdx = state.items.findIndex(i => Math.abs(i.x - m.x) <= 32 && Math.abs(i.y - m.y) <= 32);
        if (itemIdx !== -1) { state.items.splice(itemIdx, 1); addFloater(m.x, m.y, "🍽️", "#ef4444"); }
    }

    if (m.actionState === 0) {
        let steps = (m.type === "🕷") ? 2 : randomInt(1, 3); 
        if (m.slowTurns > 0) { steps = Math.max(1, Math.floor(steps / 2)); m.slowTurns--; }
        for (let s = 0; s < steps; s++) {
            const tx = state.skeletonAlly ? state.skeletonAlly.x : state.player.x;
            const ty = state.skeletonAlly ? state.skeletonAlly.y : state.player.y;
            const dx = tx - m.x;
            const dy = ty - m.y;

            if (Math.abs(dx) <= CELL && Math.abs(dy) <= CELL && (dx === 0 || dy === 0)) {
                monsterAttack(m); break; 
            }

            let nx = m.x; let ny = m.y;
            if (Math.abs(dx) >= Math.abs(dy)) nx += Math.sign(dx) * CELL;
            else ny += Math.sign(dy) * CELL;

            if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320) {
                let blocked = state.monsters.some(o => o !== m && o.x === nx && o.y === ny);
                let playerBlocked = (nx === state.player.x && ny === state.player.y);
                
                if (!blocked && !playerBlocked) {
                    m.x = nx; m.y = ny; m.startPx = m.px; m.startPy = m.py;
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
        let nx = m.x + dir[0] * dist * CELL; let ny = m.y + dir[1] * dist * CELL;

        if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320) {
            let blocked = state.monsters.some(o => o !== m && o.x === nx && o.y === ny);
            let playerBlocked = (nx === state.player.x && ny === state.player.y); 
            if (!blocked && !playerBlocked) {
                m.x = nx; m.y = ny; m.startPx = m.px; m.startPy = m.py;
                m.moveStartTime = performance.now(); m.isMoving = true; addFloater(m.x, m.y, "Teleport", "#a78bfa"); 
            }
        }
        m.actionState = 2; m.restTimer = randomInt(1, 3); 
    }
    else if (m.actionState === 2) {
        if (m.restTimer > 0) { m.restTimer--; addFloater(m.x, m.y, "zzZ", "#9ca3af"); return; } 
        else { m.actionState = 0; }
    }
  });
}

export function movePlayer(dx, dy) {
  if (!state.gameActive || state.playerHp <= 0 || floorClearTimer) return;
  
  let nx = state.player.x + dx;
  let ny = state.player.y + dy;
  if (nx < 0 || nx >= 320 || ny < 0 || ny >= 320) return;
  
  let victimIdx = state.monsters.findIndex(m => m.x === nx && m.y === ny);
  
  if (victimIdx === -1) {
    const hero = HEROES[state.heroIdx];
    if (hero.set === 'archer' && state.heroAttackRange >= 2) {
      const tx = nx + dx;
      const ty = ny + dy;
      if (tx >= 0 && tx < 320 && ty >= 0 && ty < 320) {
        const rangedIdx = state.monsters.findIndex(m => m.x === tx && m.y === ty);
        if (rangedIdx !== -1) {
          const m = state.monsters[rangedIdx];
          fight(m, rangedIdx, true);
          
          if (!m.slowedByArrow && m.hp > 0) { m.slowTurns = 1; m.slowedByArrow = true; addFloater(m.x, m.y, "❄️", "#38bdf8"); } 
          else if (m.hp > 0) { m.slowedByArrow = false; }
          
          if (state.playerHp <= 0) { endGame(); return; }
          state.totalTurns++;
          tickEffects();
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
      m.startPx = m.px; m.startPy = m.py; m.moveStartTime = performance.now(); m.isMoving = true;
    }
  }
  
  state.player.x = nx; state.player.y = ny;
  state.player.startPx = state.player.px; state.player.startPy = state.player.py;
  state.player.moveStartTime = performance.now(); state.player.isMoving = true;
  
  playSound('step'); 
  
  if (state.stairs.active && nx === state.stairs.x && ny === state.stairs.y) {
    state.currentFloor++; clearBonuses(); initFloor(); return;
  }
  
  let pickupIdx = state.items.findIndex(i => i.x === nx && i.y === ny);
  if (pickupIdx !== -1) {
    const item = state.items[pickupIdx];
    playSound('collect'); 
    
    if (item.type === 'coin') { let add = randomInt(1, 3); state.goldCount += add; state.stats.gold += add; addFloater(nx, ny, "+" + add + "g", "#fbbf24"); }
    if (item.type === 'star') { let add = randomInt(1, 3); state.tempAtk += add; addFloater(nx, ny, "+" + add + "а", "#a78bfa"); }
    if (item.type === 'shield') { let add = randomInt(1, 3); state.tempDef += add; addFloater(nx, ny, "+" + add + "з", "#3b82f6"); }
    if (item.type === 'heart') { 
        state.playerHp += 20; 
        if (state.playerHp > state.devSettings.heroes[state.heroIdx].maxHp) state.playerHp = state.devSettings.heroes[state.heroIdx].maxHp;
        addFloater(nx, ny, "+20hp", "#22c55e"); 
    }
    if (item.type === 'mana') { let add = randomInt(1, 3); state.playerMp += add; addFloater(nx, ny, "+" + add + "mp", "#3b82f6"); }
    if (item.type === 'lightning') { state.spellLightning++; addFloater(nx, ny, "+1⚡", "#fbbf24"); }
    if (item.type === 'heal') { state.spellHeal++; addFloater(nx, ny, "+1💚", "#22c55e"); }
    if (item.type === 'stun') { state.spellStun++; addFloater(nx, ny, "+1❄️", "#38bdf8"); }
    if (item.type === 'hurricane') { state.spellHurricane++; addFloater(nx, ny, "+1🌪️", "#a855f7"); }
    state.items.splice(pickupIdx, 1);
  }
  
  state.totalTurns++;
  tickEffects();
  
  if (state.totalTurns % state.settings.itemRate === 0 && !state.stairs.active) {
    const cell = findFreeCell();
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    state.items.push({x:cell.x, y:cell.y, type: type});
  }
  
  moveMonsters();
  if (state.playerHp <= 0) endGame();
}

function tickEffects() {
    state.corpses.forEach(c => c.decay--);
    state.corpses = state.corpses.filter(c => c.decay > 0);
    
    if (state.poisonTurns > 0) {
        state.playerHp -= state.poisonDmg;
        state.poisonTurns--;
        addFloater(state.player.px, state.player.py, "-" + state.poisonDmg + " яд", "#22c55e");
        if (state.playerHp <= 0) endGame();
    }
    
    if (state.playerSlowTurns > 0) state.playerSlowTurns--;
    
    if (state.abilityTurns > 0) {
        state.abilityTurns--;
        if (state.abilityTurns === 0) {
            if (state.heroIdx === 0 && state.tempAtk >= 5) state.tempAtk -= 5;
            if (state.heroIdx === 4) state.heroAttackRange = 1;
            if (state.heroIdx === 1) state.spellDiscount = 0;
            if (state.heroIdx === 2) state.skeletonAlly = null;
        }
    }
    if (state.abilityCooldown > 0) state.abilityCooldown--;
}

export function skipTurn() {
    if (!state.gameActive) return;
    const victimIdx = state.monsters.findIndex(m => m.x === state.player.x && m.y === state.player.y);
    if (victimIdx !== -1) { fight(state.monsters[victimIdx], victimIdx); if (!state.gameActive) return; }
    else playSound('skip');
    
    state.totalTurns++;
    tickEffects();
    moveMonsters();
    if (state.playerHp <= 0) endGame();
}

function endGame() {
  state.gameActive = false;
  alert("Вы погибли! Игра окончена.");
  location.reload();
}