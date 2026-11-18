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
    let base = state.devSettings.monsters[type] || ENEMY_BASE[type] || { def: 0, speed: 1 };
    
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
    state.items = [];
    state.corpses = [];
    state.floaters = [];
    state.stairs.active = false;

    state.player.x = 32; state.player.y = 160;
    state.player.px = 32; state.player.py = 160;
    state.player.startPx = 32; state.player.startPy = 160;
    state.player.isMoving = false;
    state.player.healFx = 0;

    let count = 4 + state.settings.monsterAdd;
    for (let i = 0; i < count; i++) {
        let cell = findFreeCell();
        let type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        const base = state.devSettings.monsters[type] || ENEMY_BASE[type];
        let hp = Math.floor(base.hp * (1 + (state.currentFloor - 1) * 0.2));
        let atk = Math.floor(base.atk * (1 + (state.currentFloor - 1) * 0.1));
        
        // Для мышей не спавним их сразу, если их слишком много
        if (type === "🐭" && state.monsters.filter(m => m.type === "🐭").length >= 2) {
            type = "💀"; // замена на скелета
            const skeletonBase = state.devSettings.monsters[type] || ENEMY_BASE[type];
            hp = Math.floor(skeletonBase.hp * (1 + (state.currentFloor - 1) * 0.2));
            atk = Math.floor(skeletonBase.atk * (1 + (state.currentFloor - 1) * 0.1));
        }

        placeMonster(type, hp, atk, 'chase', cell.x, cell.y);
    }

    // Пещерный фон (перенесён из старой версии)
    const bg = document.createElement('canvas');
    bg.width = 320; bg.height = 320;
    const c = bg.getContext('2d');

    c.fillStyle = '#26211d';
    c.fillRect(0, 0, 320, 320);

    // Пятна и неровности породы
    for (let i = 0; i < 160; i++) {
        const x = Math.random() * 320, y = Math.random() * 320;
        const r = 4 + Math.random() * 18;
        c.fillStyle = Math.random() < 0.5 ? 'rgba(64,54,48,0.35)' : 'rgba(28,24,22,0.35)';
        c.beginPath();
        c.ellipse(x, y, r, r * (0.5 + Math.random() * 0.7), Math.random() * Math.PI, 0, 2 * Math.PI);
        c.fill();
    }

    // Трещины
    for (let i = 0; i < 14; i++) {
        let x = Math.random() * 320, y = Math.random() * 320;
        c.strokeStyle = 'rgba(12,10,9,0.5)';
        c.lineWidth = 1 + Math.random() * 1.5;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
            x += (Math.random() - 0.5) * 40;
            y += (Math.random() - 0.5) * 40;
            c.lineTo(x, y);
        }
        c.stroke();
    }

    // Сталактиты сверху
    c.fillStyle = 'rgba(10,8,8,0.85)';
    for (let i = 0; i < 8; i++) {
        const x = i * 40 + Math.random() * 20, w = 14 + Math.random() * 18, h = 20 + Math.random() * 36;
        c.beginPath(); c.moveTo(x - w / 2, 0); c.lineTo(x + w / 2, 0); c.lineTo(x, h); c.closePath(); c.fill();
    }

    // Сталагмиты снизу
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * 320, w = 16 + Math.random() * 20, h = 14 + Math.random() * 30;
        c.beginPath(); c.moveTo(x - w / 2, 320); c.lineTo(x + w / 2, 320); c.lineTo(x, 320 - h); c.closePath(); c.fill();
    }

    // Затемнение по краям
    const g = c.createRadialGradient(160, 160, 80, 160, 160, 230);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = g;
    c.fillRect(0, 0, 320, 320);

    return bg;
}