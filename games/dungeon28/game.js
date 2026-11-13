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
    
    if (hero.name === 'Воин') { state.tempAtk += 5; addFloater(state.player.px, state.player.py, "+5 ATK", "#fbbf24"); } 
    else if (hero.name === 'Лучник') { state.heroAttackRange += 2; addFloater(state.player.px, state.player.py, "+2 RNG", "#fbbf24"); } 
    else if (hero.name === 'Маг') { state.spellDiscount = 1; addFloater(state.player.px, state.player.py, "-1 MP", "#fbbf24"); } 
    else if (hero.name === 'Паладин') { state.skeletonAlly = { x: state.player.x, y: state.player.y, hp: 50, maxHp: 50 }; addFloater(state.player.px, state.player.py, "☠️ Союзник!", "#fbbf24"); } 
    else if (hero.name === 'Ангел') {
        if (state.angelCooldown > 0) { addFloater(state.player.px, state.player.py, "КД!", "#ef4444"); return; }
        state.playerHp = Math.min(state.devSettings.heroes[state.heroIdx].maxHp, state.playerHp + 50);
        state.angelCooldown = 30;
        state.player.healFx = 1.0; 
        addFloater(state.player.px, state.player.py, "+50 HP", "#fbbf24");
    }
    playSound('magic');
}

function processTurnEnd() {
    if (!state.gameActive) return;
    state.isProcessingTurn = true;
    setTimeout(() => {
        moveMonsters();
        state.totalTurns++;
        tickEffects();
        
        if (state.monsters.length === 0) {
            state.stairs.active = true;
            startFadeOut();
            autoNextFloor();
        }
        state.isProcessingTurn = false;
    }, 400);
}

export function startFadeOut() {
  if (fadeTimer) return;
  fadeTimer = setInterval(() => {
    if (state.items.length === 0) { clearInterval(fadeTimer); fadeTimer = null; return; }
    state.items.splice(0, Math.max(1, Math.ceil(state.items.length / 40)));
    playSound('collect');
  }, 100);
}

function autoNextFloor() {
    if (floorClearTimer) clearTimeout(floorClearTimer);
    floorClearTimer = setTimeout(() => {
        if (state.gameActive && state.monsters.length === 0) {
            state.currentFloor++; 
            clearBonuses(); 
            state.items = [];
            initFloor(); 
            floorClearTimer = null;
        }
    }, 1500);
}

export function fight(m, index, ranged = false) {
  playSound('hit'); 
  let pDmg = getTotalAtk() - m.def; 
  
  if (HEROES[state.heroIdx].set === 'archer') {
      if (ranged) pDmg = Math.floor(pDmg * 1.2); 
      else pDmg = Math.floor(pDmg * 0.8);        
  }
  
  if (pDmg < 1) pDmg = 1;
  m.hp -= pDmg; addFloater(m.x, m.y, "-" + pDmg, "#ef4444");
  
  if (m.hp <= 0) {
    playSound('kill'); state.monsters.splice(index, 1); state.goldCount += 2; state.playerMp += 1; state.stats.kills++;
    
    if (m.type === "🐭" && !m.hasSplit) {
        const dirs = [[0,-1], [0,1], [-1,0], [1,0]]; let spawned = 0;
        for (let d of dirs) {
            if (spawned >= 2) break;
            let nx = m.x + d[0] * CELL, ny = m.y + d[1] * CELL;
            if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320 && !state.monsters.some(o => o.x === nx && o.y === ny) && !(state.player.x === nx && state.player.y === ny)) {
                const newHp = Math.max(1, Math.floor(m.maxHp / 3)), newAtk = Math.max(1, Math.floor(m.atk / 3));
                placeMonster("🐭", newHp, newAtk, m.behavior, nx, ny);
                const newMouse = state.monsters.find(o => o.x === nx && o.y === ny);
                if (newMouse) { newMouse.hasSplit = true; newMouse.maxHp = newHp; }
                spawned++;
            }
        }
        if (spawned > 0) addFloater(m.x, m.y, "Деление!", "#a855f7");
    }
    if (m.type !== "🐭" && m.type !== "🕷") state.corpses.push({ x: m.x, y: m.y, type: m.type, decay: 15 });
    return true; 
  }
  
  if (!ranged && !m.isStunned) {
    const mDmg = Math.max(0, m.atk - getTotalDef());
    if (mDmg > 0) { state.playerHp -= mDmg; addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444"); }
  }
  return false;
}

export function castLightning() {
    if (state.spellLightning <= 0) return;
    const targets = state.monsters.filter(m => Math.abs(m.x - state.player.x) <= 64 && Math.abs(m.y - state.player.y) <= 64);
    if (targets.length === 0) { addFloater(state.player.px, state.player.py, "Нет целей", "#9ca3af"); return; }
    
    const cost = Math.max(0, 3 - state.spellDiscount);
    if (state.playerMp >= cost) state.playerMp -= cost;
    state.spellLightning--; playSound('magic');
    
    targets.forEach(m => {
        m.hp -= 20; m.lightningFx = 1.0; 
        addFloater(m.x, m.y, "-20", "#fbbf24");
        if (m.hp <= 0) {
            const idx = state.monsters.indexOf(m); if (idx > -1) state.monsters.splice(idx, 1);
            state.goldCount += 2; state.stats.kills++;
            if (m.type !== "🐭" && m.type !== "🕷") state.corpses.push({ x: m.x, y: m.y, type: m.type, decay: 15 });
        }
    });
}

export function castHeal() {
    if (state.spellHeal <= 0) return;
    const maxHp = state.devSettings.heroes[state.heroIdx].maxHp;
    if (state.playerHp >= maxHp) { addFloater(state.player.px, state.player.py, "Полное HP", "#9ca3af"); return; }
    
    const cost = Math.max(0, 3 - state.spellDiscount);
    if (state.playerMp >= cost) state.playerMp -= cost;
    state.spellHeal--; playSound('magic');
    
    state.playerHp += 30; if (state.playerHp > maxHp) state.playerHp = maxHp;
    state.player.healFx = 1.0; 
    addFloater(state.player.px, state.player.py, "+30hp", "#22c55e");
}

export function castStun() {
    if (state.spellStun <= 0) return;
    const cost = Math.max(0, 2 - state.spellDiscount);
    if (state.playerMp >= cost) state.playerMp -= cost;
    state.spellStun--; playSound('magic');
    
    state.monsters.forEach(m => { m.isStunned = true; m.stunTimer = 2; m.stunFx = 1.0; addFloater(m.x, m.y, "❄️", "#38bdf8"); });
}

export function castHurricane() {
    if (state.spellHurricane <= 0) return;
    const targets = state.monsters.filter(m => Math.abs(m.x - state.player.x) <= 64 && Math.abs(m.y - state.player.y) <= 64);
    if (targets.length === 0) { addFloater(state.player.px, state.player.py, "Нет целей", "#9ca3af"); return; }
    
    const cost = Math.max(0, 4 - state.spellDiscount);
    if (state.playerMp >= cost) state.playerMp -= cost;
    state.spellHurricane--; playSound('magic');
    
    targets.forEach(m => {
        let nx = m.x + Math.sign(m.x - state.player.x) * CELL * 3;
        let ny = m.y + Math.sign(m.y - state.player.y) * CELL * 3;
        nx = Math.max(0, Math.min(288, nx)); ny = Math.max(0, Math.min(288, ny));
        m.x = nx; m.y = ny; m.startPx = m.px; m.startPy = m.py;
        m.moveStartTime = performance.now(); m.isMoving = true;
        m.spinFx = 1.0; 
        addFloater(m.x, m.y, "🌪️", "#a855f7");
    });
}

function monsterAttack(m) {
  if (!m.isStunned) {
    playSound('hit');
    const mDmg = Math.max(0, m.atk - getTotalDef());
    
    if (m.type === "💀") { m.hp = Math.min(m.maxHp, m.hp + 3); addFloater(m.x, m.y, "+3 HP", "#22c55e"); }
    if (m.type === "👻") { state.playerMp = Math.max(0, state.playerMp - 2); addFloater(state.player.px, state.player.py, "-2 MP", "#3b82f6"); }
    if (m.type === "🕷") { if (state.playerSlowTurns === 0) state.playerSlowTurns = 3; else state.playerSlowTurns += 1; addFloater(state.player.px, state.player.py, "🕸️", "#38bdf8"); }
    if (m.type === "🧟") { if (state.poisonTurns > 0) { state.poisonDmg += 3; state.poisonTurns = 3; } else { state.poisonDmg = 5; state.poisonTurns = 3; } addFloater(state.player.px, state.player.py, "☠️", "#22c55e"); }

    if (state.skeletonAlly) {
        state.skeletonAlly.hp -= mDmg; addFloater(state.skeletonAlly.x, state.skeletonAlly.y, "-" + mDmg, "#ef4444");
        if (state.skeletonAlly.hp <= 0) { state.skeletonAlly = null; addFloater(m.x, m.y, "💀", "#ef4444"); }
    } else {
        if (mDmg > 0) { state.playerHp -= mDmg; addFloater(state.player.px, state.player.py, "-" + mDmg, "#ef4444"); }
    }
  }
}

function findClosestItem(m, type) {
    let closest = null, minDist = 999;
    state.items.forEach(i => {
        if (i.type === type) {
            const dist = Math.abs(i.x - m.x) / CELL + Math.abs(i.y - m.y) / CELL;
            if (dist < minDist && dist <= 3) { minDist = dist; closest = i; }
        }
    });
    return closest;
}

function getMoveTarget(m, diff) {
    let targetX = state.player.x, targetY = state.player.y;
    if (state.skeletonAlly) { targetX = state.skeletonAlly.x; targetY = state.skeletonAlly.y; }

    if (diff !== 'simple') {
        let i1 = ENEMY_BASE[m.type]?.interest1 || "-";
        let i2 = ENEMY_BASE[m.type]?.interest2 || "-";
        let item1 = null, item2 = null;

        if (i1 === 'Атака' || (diff === 'extreme' || diff === 'critical') && m.atk <= getTotalDef() + 1) item1 = findClosestItem(m, 'star');
        else if (i1 === 'Мана') item1 = findClosestItem(m, 'mana');
        else if (i1 === 'Жизнь') item1 = findClosestItem(m, 'heart');
        else if (i1 === 'Защита') item1 = findClosestItem(m, 'shield');
        else if (i1 === 'Бонусы') item1 = findClosestItem(m, 'coin');

        if (i2 === 'Атака') item2 = findClosestItem(m, 'star');
        else if (i2 === 'Мана') item2 = findClosestItem(m, 'mana');
        else if (i2 === 'Жизнь') item2 = findClosestItem(m, 'heart');
        else if (i2 === 'Защита') item2 = findClosestItem(m, 'shield');
        else if (i2 === 'Бонусы') item2 = findClosestItem(m, 'coin');

        const distHero = Math.abs(targetX - m.x) / CELL + Math.abs(targetY - m.y) / CELL;
        const dist1 = item1 ? Math.abs(item1.x - m.x) / CELL + Math.abs(item1.y - m.y) / CELL : 999;
        const dist2 = item2 ? Math.abs(item2.x - m.x) / CELL + Math.abs(item2.y - m.y) / CELL : 999;

        if (item1 && dist1 <= 3 && dist1 < distHero) { targetX = item1.x; targetY = item1.y; }
        else if (item2 && dist2 <= 3 && dist2 < distHero) { targetX = item2.x; targetY = item2.y; }
        else if (item1 && dist1 <= 3) { targetX = item1.x; targetY = item1.y; }
        else if (item2 && dist2 <= 3) { targetX = item2.x; targetY = item2.y; }
    }
    return { x: targetX, y: targetY };
}

function moveMonsters() {
  const diff = state.settings.difficulty;
  
  state.monsters.forEach((m, idx) => {
    if (m.isStunned) { m.stunTimer--; if (m.stunTimer <= 0) m.isStunned = false; return; }

    if (m.type === "🧙‍♂️" && Math.random() < 0.3) {
        const corpseIdx = state.corpses.findIndex(c => c.type !== "🧟" && Math.abs(c.x - m.x) <= CELL * 2 && Math.abs(c.y - m.y) <= CELL * 2);
        if (corpseIdx !== -1) {
            const corpse = state.corpses[corpseIdx]; state.corpses.splice(corpseIdx, 1);
            placeMonster("🧟", 150, 6, m.behavior, corpse.x, corpse.y);
            addFloater(corpse.x, corpse.y, "☠️", "#a78bfa"); playSound('magic'); return; 
        }
    }

    if (m.type === "🏹" || m.type === "🦹") {
        const dx = Math.abs(m.x - state.player.x), dy = Math.abs(m.y - state.player.y);
        if (dx <= CELL * 3 && dy <= CELL * 3) { monsterAttack(m); addFloater(m.x, m.y, "🏹", "#f59e0b"); return; }
    }
    
    if (m.type === "😈" && m.hp < m.maxHp) { m.hp = Math.min(m.maxHp, m.hp + 10); addFloater(m.x, m.y, "+10", "#22c55e"); }
    
    if (m.type === "👺" || m.type === "💀" || m.type === "👻" || m.type === "🐭" || m.type === "🐢") {
        const itemIdx = state.items.findIndex(i => Math.abs(i.x - m.x) < CELL && Math.abs(i.y - m.y) < CELL);
        if (itemIdx !== -1) { 
            let eaten = state.items[itemIdx];
            if (m.type === "👺" || (m.type === "💀" && eaten.type === 'star') || (m.type === "👻" && eaten.type === 'mana') || (m.type === "🐭" && eaten.type === 'heart') || (m.type === "🐢" && eaten.type === 'shield')) {
                state.items.splice(itemIdx, 1); addFloater(m.x, m.y, "🍽️", "#ef4444"); 
            }
        }
    }

    const target = getMoveTarget(m, diff);

    if (m.actionState === 0) {
        let steps = (m.type === "🕷") ? 2 : randomInt(1, 3); 
        if (m.slowTurns > 0) { steps = Math.max(1, Math.floor(steps / 2)); m.slowTurns--; }
        for (let s = 0; s < steps; s++) {
            const dx = target.x - m.x, dy = target.y - m.y;
            if (Math.abs(dx) <= CELL && Math.abs(dy) <= CELL && (dx === 0 || dy === 0)) { monsterAttack(m); break; }
            let nx = m.x, ny = m.y;
            if (Math.abs(dx) >= Math.abs(dy)) nx += Math.sign(dx) * CELL; else ny += Math.sign(dy) * CELL;
            if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320 && !state.monsters.some(o => o !== m && o.x === nx && o.y === ny) && !(nx === state.player.x && ny === state.player.y)) {
                m.x = nx; m.y = ny; m.startPx = m.px; m.startPy = m.py; m.moveStartTime = performance.now(); m.isMoving = true;
            } else break; 
        }
        m.actionState = 1; 
    } else if (m.actionState === 1) {
        const dist = randomInt(1, 4), dirs = [[1,0], [-1,0], [0,1], [0,-1]], dir = dirs[Math.floor(Math.random() * 4)];
        let nx = m.x + dir[0] * dist * CELL, ny = m.y + dir[1] * dist * CELL;
        if (nx >= 0 && nx < 320 && ny >= 0 && ny < 320 && !state.monsters.some(o => o !== m && o.x === nx && o.y === ny) && !(nx === state.player.x && ny === state.player.y)) {
            m.x = nx; m.y = ny; m.startPx = m.px; m.startPy = m.py; m.moveStartTime = performance.now(); m.isMoving = true;
        }
        m.actionState = 2; m.restTimer = randomInt(1, 3); 
    } else if (m.actionState === 2) {
        if (m.restTimer > 0) { m.restTimer--; return; } else m.actionState = 0; 
    }
  });
}

export function movePlayer(dx, dy) {
  if (!state.gameActive || state.playerHp <= 0 || floorClearTimer || state.isProcessingTurn) return;
  
  let nx = state.player.x + dx, ny = state.player.y + dy;
  if (nx < 0 || nx >= 320 || ny < 0 || ny >= 320) return;
  let victimIdx = state.monsters.findIndex(m => m.x === nx && m.y === ny);
  
  if (victimIdx === -1) {
    const hero = HEROES[state.heroIdx];
    if (hero.set === 'archer' && state.heroAttackRange >= 2) {
      const tx = nx + dx, ty = ny + dy;
      if (tx >= 0 && tx < 320 && ty >= 0 && ty < 320) {
        const rangedIdx = state.monsters.findIndex(m => m.x === tx && m.y === ty);
        if (rangedIdx !== -1) {
          const m = state.monsters[rangedIdx]; fight(m, rangedIdx, true);
          if (!m.slowedByArrow && m.hp > 0) { m.slowTurns = 1; m.slowedByArrow = true; addFloater(m.x, m.y, "❄️", "#38bdf8"); } 
          else if (m.hp > 0) m.slowedByArrow = false;
          processTurnEnd(); return;
        }
      }
    }
  }
  
  if (victimIdx !== -1) {
    const m = state.monsters[victimIdx];
    const killed = fight(m, victimIdx);
    if (state.playerHp <= 0) { endGame(); return; }
    if (!killed) {
      m.x = state.player.x; m.y = state.player.y; m.startPx = m.px; m.startPy = m.py; m.moveStartTime = performance.now(); m.isMoving = true;
    }
  }
  
  state.player.x = nx; state.player.y = ny; state.player.startPx = state.player.px; state.player.startPy = state.player.py;
  state.player.moveStartTime = performance.now(); state.player.isMoving = true;
  playSound('step'); 
  
  if (state.stairs.active && nx === state.stairs.x && ny === state.stairs.y) {
    state.currentFloor++; clearBonuses(); state.items = []; initFloor(); return;
  }
  
  let pickupIdx = state.items.findIndex(i => i.x === nx && i.y === ny);
  if (pickupIdx !== -1) {
    const item = state.items[pickupIdx]; playSound('collect'); 
    if (item.type === 'coin') { let a = randomInt(1, 3); state.goldCount += a; state.stats.gold += a; addFloater(nx, ny, "+" + a + "g", "#fbbf24"); }
    if (item.type === 'star') { let a = randomInt(1, 3); state.tempAtk += a; addFloater(nx, ny, "+" + a + "а", "#a78bfa"); }
    if (item.type === 'shield') { let a = randomInt(1, 3); state.tempDef += a; addFloater(nx, ny, "+" + a + "з", "#3b82f6"); }
    if (item.type === 'heart') { state.playerHp += 20; if (state.playerHp > state.devSettings.heroes[state.heroIdx].maxHp) state.playerHp = state.devSettings.heroes[state.heroIdx].maxHp; addFloater(nx, ny, "+20hp", "#22c55e"); }
    if (item.type === 'mana') { let a = randomInt(1, 3); state.playerMp += a; addFloater(nx, ny, "+" + a + "mp", "#3b82f6"); }
    if (item.type === 'lightning') { state.spellLightning++; addFloater(nx, ny, "+1⚡", "#fbbf24"); }
    if (item.type === 'heal') { state.spellHeal++; addFloater(nx, ny, "+1💚", "#22c55e"); }
    if (item.type === 'stun') { state.spellStun++; addFloater(nx, ny, "+1❄️", "#38bdf8"); }
    if (item.type === 'hurricane') { state.spellHurricane++; addFloater(nx, ny, "+1🌪️", "#a855f7"); }
    state.items.splice(pickupIdx, 1);
  }
  
  if (state.totalTurns % state.settings.itemRate === 0 && !state.stairs.active) {
    if (state.items.length < 60) {
        let cell = findFreeCell();
        let attempts = 0;
        while (state.items.some(i => i.x === cell.x && i.y === cell.y) && attempts < 50) {
            cell = findFreeCell();
            attempts++;
        }
        if (attempts < 50) {
            const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
            state.items.push({x:cell.x, y:cell.y, type: type, life: 20});
        }
    }
  }
  
  processTurnEnd();
}

function tickEffects() {
    state.items.forEach(i => i.life--);
    state.items = state.items.filter(i => i.life > 0);

    state.corpses.forEach(c => c.decay--); state.corpses = state.corpses.filter(c => c.decay > 0);
    if (state.poisonTurns > 0) {
        state.playerHp -= state.poisonDmg; state.poisonTurns--; addFloater(state.player.px, state.player.py, "-" + state.poisonDmg + " яд", "#22c55e");
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
    if (state.angelCooldown > 0) state.angelCooldown--;
}

export function skipTurn() {
    if (!state.gameActive || state.isProcessingTurn) return;
    const victimIdx = state.monsters.findIndex(m => m.x === state.player.x && m.y === state.player.y);
    if (victimIdx !== -1) { fight(state.monsters[victimIdx], victimIdx); if (!state.gameActive) return; }
    else playSound('skip');
    processTurnEnd();
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ СМЕРТИ
function endGame() {
  if (!state.gameActive) return; // Защита от повторного вызова
  state.gameActive = false; 
  state.playerHp = 0;
  playSound('hit'); 
  
  // Сохраняем рекорд
  if (state.totalTurns > state.highScore.turns) {
      state.highScore.turns = state.totalTurns;
      state.highScore.name = localStorage.getItem('pz_heroName') || 'Гость';
      localStorage.setItem('pz_highscore', JSON.stringify(state.highScore));
  }

  // Делаем мягкий переход, чтобы браузер не завис
  setTimeout(() => {
      alert("Вы погибли! Игра окончена.");
      // Вместо location.reload() делаем безопасный возврат в меню
      document.getElementById('game-screen').style.display = 'none';
      document.getElementById('login-screen').style.display = 'flex';
      document.querySelector('#login-screen h1').innerText = 'ПОДЗЕМЕЛЬЕ ' + VERSION; // Обновляем версию на экране
      renderCarousel(); // Перерисовываем карусель
  }, 100);
}