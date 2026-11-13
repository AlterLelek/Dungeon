import { state } from './state.js';
import { CELL, MONSTER_SKINS, ENEMY_BASE, ENEMY_TYPES } from './config.js';

export function findFreeCell() {
    let attempts = 0;
    while (attempts < 100) {
        let cx = Math.floor(Math.random() * (320 / CELL)) * CELL;
        let cy = Math.floor(Math.random() * (320 / CELL)) * CELL;
        if (cx === state.player.x && cy === state.player.y) { attempts++; continue; }
        if (state.monsters.some(m => m.x === cx && m.y === cy)) { attempts++; continue; }
        if (state.items.some(i => i.x === cx && i.y === cy)) { attempts++; continue; }
        if (state.stairs.x === cx && state.stairs.y === cy) { attempts++; continue; }
        return { x: cx, y: cy };
    }
    return { x: 0, y: 0 };
}

export function placeMonster(type, hp, atk, behavior, x, y) {
    let base = ENEMY_BASE[type] || { def: 0, speed: 1 };
    
    // Выбираем случайный скин из доступных для этого типа
    let skinsList = MONSTER_SKINS[type] || [];
    let selectedSkin = skinsList.length > 0 ? skinsList[Math.floor(Math.random() * skinsList.length)] : null;

    state.monsters.push({
        x: x, y: y, px: x, py: y, startPx: x, startPy: y,
        type: type,
        sprite: selectedSkin, // Запоминаем скин за конкретным монстром
        hp: hp, maxHp: hp, atk: atk, def: base.def,
        speed: base.speed, behavior: behavior,
        isStunned: false, stunTimer: 0, isMoving: false, moveStartTime: 0,
        actionState: 0, restTimer: 0, slowTurns: 0, hasSplit: false
    });
}

export function initFloor() {
    state.monsters = [];
    
    let count = 4 + state.settings.monsterAdd; 
    for (let i = 0; i < count; i++) {
        let cell = findFreeCell();
        let type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        let base = ENEMY_BASE[type];
        let hp = Math.floor(base.hp * (1 + (state.currentFloor - 1) * 0.2));
        let atk = Math.floor(base.atk * (1 + (state.currentFloor - 1) * 0.1));
        
        // Для мышей не спавним их сразу, если их слишком много
        if (type === "🐭" && state.monsters.filter(m => m.type === "🐭").length >= 2) {
            type = "💀"; // замена на скелета
            base = ENEMY_BASE[type];
            hp = Math.floor(base.hp * (1 + (state.currentFloor - 1) * 0.2));
            atk = Math.floor(base.atk * (1 + (state.currentFloor - 1) * 0.1));
        }

        placeMonster(type, hp, atk, 'chase', cell.x, cell.y);
    }

    // Отрисовка фона
    const bg = document.createElement('canvas');
    bg.width = 320; bg.height = 320;
    const bctx = bg.getContext('2d');
    bctx.fillStyle = "#241f1d";
    bctx.fillRect(0, 0, 320, 320);
    
    // ... добавление текстур пола (если нужно)
    return bg;
}